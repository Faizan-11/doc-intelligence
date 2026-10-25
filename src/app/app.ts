
import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Api, HealthResponse } from './services/api';
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
      },
      error: () => {
        this.backendStatus.set('Offline');
        this.backendError.set(
          'Unable to connect to the backend API.',
        );
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

    const newDocuments: DocumentItem[] = [];
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
      newDocuments.push(
        this.documentValidation.createDocument(file),
      );
    }

    this.documents.update((current) => [
      ...current,
      ...newDocuments,
    ]);

    if (errors.length > 0) {
      this.errorMessage.set(errors.join(' '));
    }

    input.value = '';
  }

  protected removeDocument(id: string): void {
    this.documents.update((current) =>
      current.filter((document) => document.id !== id),
    );
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
