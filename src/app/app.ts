import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DocumentItem } from './document.model';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('Document Intelligence');
  protected readonly documents = signal<DocumentItem[]>([]);
  protected readonly errorMessage = signal('');
  private readonly maxFileSize = 10 * 1024 * 1024;

  private readonly allowedExtensions = new Set([
  'pdf',
  'txt',
  'md',
  'doc',
  'docx',
]);

  protected onFilesSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);

  this.errorMessage.set('');

  const currentDocuments = this.documents();
  const existingKeys = new Set(
    currentDocuments.map(
      (document) => `${document.name}:${document.size}:${document.type}`,
    ),
  );

  const newDocuments: DocumentItem[] = [];
  const errors: string[] = [];
  const seenKeys = new Set(existingKeys);

  for (const file of files) {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

    if (!this.allowedExtensions.has(extension)) {
      errors.push(`${file.name}: unsupported file type.`);
      continue;
    }

    if (file.size > this.maxFileSize) {
      errors.push(`${file.name}: exceeds the 10 MiB limit.`);
      continue;
    }

    const key = `${file.name}:${file.size}:${file.type}`;

    if (seenKeys.has(key)) {
      errors.push(`${file.name}: duplicate file skipped.`);
      continue;
    }

    seenKeys.add(key);

    newDocuments.push({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type || 'Unknown file type',
      file,
    });
  }

  this.documents.update((current) => [...current, ...newDocuments]);

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