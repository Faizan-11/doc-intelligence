
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface HealthResponse {
  status: string;
  application: string;
}

export type IngestionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export interface BackendDocument {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string | null;
  storageFileName: string;
  uploadedAt: string;
  extractedText?: string | null;
  ingestionStatus: IngestionStatus;
  ingestionError: string | null;
}

export interface QaResponse {
  answer: string;
  sources: string[];
}

@Injectable({
  providedIn: 'root',
})
export class Api {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api';

  getHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(
      `${this.baseUrl}/health`,
    );
  }

  getDocuments(): Observable<BackendDocument[]> {
    return this.http.get<BackendDocument[]>(
      `${this.baseUrl}/documents`,
    );
  }

  searchDocuments(keyword: string): Observable<BackendDocument[]> {
    return this.http.get<BackendDocument[]>(
      `${this.baseUrl}/documents/search`,
      {
        params: { keyword },
      },
    );
  }

  uploadDocument(file: File): Observable<BackendDocument> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<BackendDocument>(
      `${this.baseUrl}/documents`,
      formData,
    );
  }

  retryDocumentIngestion(id: string): Observable<BackendDocument> {
    return this.http.post<BackendDocument>(
      `${this.baseUrl}/documents/${id}/retry`,
      {},
    );
  }

  deleteDocument(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/documents/${id}`,
    );
  }

  getDocumentText(id: string): Observable<string> {
    return this.http.get(
      `${this.baseUrl}/documents/${id}/text`,
      { responseType: 'text' },
    );
  }

  downloadDocument(id: string): Observable<Blob> {
  return this.http.get(
    `${this.baseUrl}/documents/${id}/download`,
    { responseType: 'blob' },
  );
}

  askDocumentQuestion(
    documentId: string,
    question: string,
    topK: number = 5,
  ): Observable<QaResponse> {
    return this.http.post<QaResponse>(
      `${this.baseUrl}/qa/documents/${documentId}/ask`,
      {
        question,
        topK,
      },
    );
  }
}
