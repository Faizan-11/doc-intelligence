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

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    this.errorMessage.set('');

    const existingDocuments = this.documents();
    const newDocuments: DocumentItem[] = [];

    for (const file of files) {
      const alreadyExists = existingDocuments.some(
        (document) => document.name === file.name && document.size === file.size,
      );

      if (alreadyExists) {
        continue;
      }

      newDocuments.push({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type || 'Unknown file type',
        file,
      });
    }

    this.documents.update((current) => [...current, ...newDocuments]);

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