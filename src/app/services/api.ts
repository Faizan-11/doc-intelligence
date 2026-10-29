
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface HealthResponse {
  status: string;
  application: string;
}

export interface BackendDocument {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string | null;
  storageFileName: string;
  uploadedAt: string;
  extractedText?: string | null;

}

@Injectable({
  providedIn: 'root',
})
export class Api {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api';

  getHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.baseUrl}/health`);
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

  deleteDocument(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/documents/${id}`,
    );
  }

  getDownloadUrl(id: string): string {
    return `${this.baseUrl}/documents/${id}/download`;
  }
}
