
import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  Api,
  BackendDocument,
  HealthResponse,
} from './services/api';
import { DocumentItem } from './document.model';
import { DocumentValidationService } from './document-validation.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly title = signal('Document Intelligence');
  protected readonly documents = signal<DocumentItem[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly isSearching = signal(false);
  protected readonly hasSearched = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly backendStatus = signal('Checking...');
  protected readonly backendError = signal('');

  constructor(
    private readonly documentValidation: DocumentValidationService,
    private readonly api: Api,
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


protected downloadDocument(id: string): void {
  window.open(this.api.getDownloadUrl(id), '_blank');
}



  protected removeDocument(id: string): void {
    this.api.deleteDocument(id).subscribe({
      next: () => {
        this.documents.update((current) =>
          current.filter((document) => document.id !== id),
        );
        this.errorMessage.set('');
      },
      error: () => {
        this.errorMessage.set(
          'Unable to delete the document from the backend.',
        );
      },
    });
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
