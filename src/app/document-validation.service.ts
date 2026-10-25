
import { Injectable } from '@angular/core';
import { DocumentItem } from './document.model';

@Injectable({
  providedIn: 'root',
})
export class DocumentValidationService {
  readonly maxFileSize = 10 * 1024 * 1024;

  private readonly allowedExtensions = new Set([
    'pdf',
    'txt',
    'md',
    'doc',
    'docx',
  ]);

  validateFile(file: File): string | null {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

    if (!this.allowedExtensions.has(extension)) {
      return `${file.name}: unsupported file type.`;
    }

    if (file.size > this.maxFileSize) {
      return `${file.name}: exceeds the 10 MiB limit.`;
    }

    return null;
  }

  createDocument(file: File): DocumentItem {
    return {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type || 'Unknown file type',
      file,
    };
  }
}
