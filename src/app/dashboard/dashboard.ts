
import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth';

import {
  Api,
  BackendDocument,
  HealthResponse,
  QaResponse,
} from '../services/api';

import { DocumentItem } from '../document.model';
import { DocumentValidationService } from '../document-validation.service';



@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
styleUrl: './dashboard.scss',
})

export class Dashboard implements OnInit {
  protected readonly title = signal('Document Intelligence');
  protected readonly documents = signal<DocumentItem[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly isSearching = signal(false);
  protected readonly hasSearched = signal(false);
  protected readonly selectedDocumentName = signal('');
  protected readonly documentText = signal('');
  protected readonly viewingDocumentId = signal<string | null>(null);
  protected readonly isLoadingText = signal(false);
  protected readonly viewerError = signal('');
  protected readonly errorMessage = signal('');
  protected readonly backendStatus = signal('Checking...');
  protected readonly backendError = signal('');

  // Document ingestion state
  protected readonly retryingDocumentIds = signal<string[]>([]);

  // Document-specific Q&A state
  protected readonly askingDocumentId = signal<string | null>(null);
  protected readonly question = signal('');
  protected readonly qaAnswer = signal('');
  protected readonly qaSources = signal<string[]>([]);
  protected readonly isAskingQuestion = signal(false);
  protected readonly qaError = signal('');

  constructor(
  private readonly documentValidation: DocumentValidationService,
  private readonly api: Api,
  private readonly authService: AuthService,
  private readonly router: Router,
) {}


  ngOnInit(): void {
    this.api.getHealth().subscribe({
      next: (response: HealthResponse) => {
        this.backendStatus.set(response.status);
        this.backendError.set('');
        this.loadDocuments();
      },
      error: () => {
        this.backendStatus.set('Offline');
        this.backendError.set(
          'Unable to connect to the backend API.',
        );
      },
    });
  }

  private loadDocuments(): void {
    this.isSearching.set(false);
    this.api.getDocuments().subscribe({
      next: (savedDocuments: BackendDocument[]) => {
        this.documents.set(
          savedDocuments.map((document) => ({
            id: document.id,
            name: document.fileName,
            size: document.fileSize,
            type: document.contentType ?? '',
            file: new File([], document.fileName, {
              type: document.contentType ?? '',
            }),
            ingestionStatus: document.ingestionStatus,
            ingestionError: document.ingestionError,
          })),
        );
      },
      error: () => {
        this.errorMessage.set(
          'Unable to load saved documents from the backend.',
        );
      },
    });
  }

  protected onSearch(): void {
    const keyword = this.searchQuery().trim();

    if (!keyword) {
      this.hasSearched.set(false);
      this.loadDocuments();
      return;
    }

    this.hasSearched.set(true);
    this.isSearching.set(true);
    this.errorMessage.set('');

    this.api.searchDocuments(keyword).subscribe({
      next: (results: BackendDocument[]) => {
        this.documents.set(
          results.map((document) => ({
            id: document.id,
            name: document.fileName,
            size: document.fileSize,
            type: document.contentType ?? '',
            file: new File([], document.fileName, {
              type: document.contentType ?? '',
            }),
            ingestionStatus: document.ingestionStatus,
            ingestionError: document.ingestionError,
          })),
        );

        this.isSearching.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to search documents.');
        this.isSearching.set(false);
      },
    });
  }

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    this.errorMessage.set('');

    const existingDocuments = this.documents();
    const seenKeys = new Set(
      existingDocuments.map(
        (document) =>
          `${document.name}:${document.size}:${document.type}`,
      ),
    );

    const errors: string[] = [];

    for (const file of files) {
      const validationError =
        this.documentValidation.validateFile(file);

      if (validationError) {
        errors.push(validationError);
        continue;
      }

      const key = `${file.name}:${file.size}:${file.type}`;

      if (seenKeys.has(key)) {
        errors.push(`${file.name}: duplicate file skipped.`);
        continue;
      }

      seenKeys.add(key);

      this.api.uploadDocument(file).subscribe({
        next: (savedDocument) => {
          const documentItem: DocumentItem = {
            id: savedDocument.id,
            name: savedDocument.fileName,
            size: savedDocument.fileSize,
            type: savedDocument.contentType ?? '',
            file,
            ingestionStatus: savedDocument.ingestionStatus,
            ingestionError: savedDocument.ingestionError,
          };

          this.documents.update((current) => [
            ...current,
            documentItem,
          ]);
        },
        error: () => {
          errors.push(
            `${file.name}: unable to upload the file to the backend.`,
          );
          this.errorMessage.set(errors.join(' '));
        },
      });
    }

    if (errors.length > 0) {
      this.errorMessage.set(errors.join(' '));
    }

    input.value = '';
  }

  protected retryDocumentIngestion(id: string): void {
    if (this.retryingDocumentIds().includes(id)) {
      return;
    }

    this.retryingDocumentIds.update((current) => [
      ...current,
      id,
    ]);

    this.errorMessage.set('');

    this.documents.update((current) =>
      current.map((document) =>
        document.id === id
          ? {
              ...document,
              ingestionStatus: 'PROCESSING',
              ingestionError: null,
            }
          : document,
      ),
    );

    this.api.retryDocumentIngestion(id).subscribe({
      next: (response: BackendDocument) => {
        this.documents.update((current) =>
          current.map((document) =>
            document.id === id
              ? {
                  ...document,
                  ingestionStatus: response.ingestionStatus,
                  ingestionError: response.ingestionError,
                }
              : document,
          ),
        );

        if (response.ingestionStatus === 'FAILED') {
          this.errorMessage.set(
            `Retry failed for ${response.fileName}: ${
              response.ingestionError ?? 'Unknown ingestion error.'
            }`,
          );
        }

        this.finishRetry(id);
      },
      error: () => {
        this.documents.update((current) =>
          current.map((document) =>
            document.id === id
              ? {
                  ...document,
                  ingestionStatus: 'FAILED',
                  ingestionError: 'Unable to retry document ingestion.',
                }
              : document,
          ),
        );

        this.errorMessage.set(
          'Unable to communicate with the backend while retrying ingestion.',
        );

        this.finishRetry(id);
      },
    });
  }

  private finishRetry(id: string): void {
    this.retryingDocumentIds.update((current) =>
      current.filter((documentId) => documentId !== id),
    );
  }

  protected viewDocument(id: string, name: string): void {
    this.viewingDocumentId.set(id);
    this.selectedDocumentName.set(name);
    this.documentText.set('');
    this.viewerError.set('');
    this.isLoadingText.set(true);

    this.api.getDocumentText(id).subscribe({
      next: (text: string) => {
        this.documentText.set(text);
        this.isLoadingText.set(false);
      },
      error: () => {
        this.viewerError.set(
          'Unable to load extracted text for this document.',
        );
        this.isLoadingText.set(false);
      },
    });
  }

  protected closeDocumentViewer(): void {
    this.viewingDocumentId.set(null);
    this.selectedDocumentName.set('');
    this.documentText.set('');
    this.viewerError.set('');
    this.isLoadingText.set(false);
  }

  protected downloadDocument(id: string): void {
  this.api.downloadDocument(id).subscribe({
    next: (blob: Blob) => {
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;

      const selectedDocument = this.documents().find(
        (document) => document.id === id,
      );

      link.download = selectedDocument?.name ?? 'document';

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    },
    error: () => {
      this.errorMessage.set(
        'Unable to download the document.',
      );
    },
  });
}

  protected removeDocument(id: string): void {
    this.api.deleteDocument(id).subscribe({
      next: () => {
        this.documents.update((current) =>
          current.filter((document) => document.id !== id),
        );

        if (this.askingDocumentId() === id) {
          this.closeDocumentQa();
        }

        this.errorMessage.set('');
      },
      error: () => {
        this.errorMessage.set(
          'Unable to delete the document from the backend.',
        );
      },
    });
  }

  // Open Q&A for a selected document
  protected openDocumentQa(id: string, name: string): void {
    this.askingDocumentId.set(id);
    this.selectedDocumentName.set(name);
    this.question.set('');
    this.qaAnswer.set('');
    this.qaSources.set([]);
    this.qaError.set('');
    this.isAskingQuestion.set(false);
  }

  // Submit a question about the selected document
  protected askQuestion(): void {
    const documentId = this.askingDocumentId();
    const question = this.question().trim();

    if (!documentId || !question || this.isAskingQuestion()) {
      return;
    }

    const selectedDocument = this.documents().find(
      (document) => document.id === documentId,
    );

    if (selectedDocument?.ingestionStatus !== 'COMPLETED') {
      this.qaError.set(
        'This document is not ready for AI questions. Please wait for ingestion to complete.',
      );
      return;
    }

    this.isAskingQuestion.set(true);
    this.qaError.set('');
    this.qaAnswer.set('');
    this.qaSources.set([]);

    this.api.askDocumentQuestion(
      documentId,
      question,
      5,
    ).subscribe({
      next: (response: QaResponse) => {
        this.qaAnswer.set(response.answer);
        this.qaSources.set(response.sources);
        this.isAskingQuestion.set(false);
      },
      error: () => {
        this.qaError.set(
          'Unable to generate an answer. Please try again.',
        );
        this.isAskingQuestion.set(false);
      },
    });
  }

  // Close the document-specific Q&A panel
  protected closeDocumentQa(): void {
    this.askingDocumentId.set(null);
    this.question.set('');
    this.qaAnswer.set('');
    this.qaSources.set([]);
    this.qaError.set('');
    this.isAskingQuestion.set(false);
  }

  protected logout(): void {
  this.authService.logout();
  this.router.navigate(['/login']);
}

  protected formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
