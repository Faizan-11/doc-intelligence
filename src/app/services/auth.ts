import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface AuthResponse {
  token: string;
  tokenType: string;
  userId: string;
  name: string;
  email: string;
}

export interface AuthenticatedUser {
  userId: string;
  name: string;
  email: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/api/auth';
  private readonly storageKey = 'documind_auth';

  private readonly authState = signal<AuthResponse | null>(
    this.readStoredAuth(),
  );

  readonly currentUser = computed<AuthenticatedUser | null>(() => {
    const auth = this.authState();

    if (!auth) {
      return null;
    }

    return {
      userId: auth.userId,
      name: auth.name,
      email: auth.email,
    };
  });

  readonly isAuthenticated = computed(
    () => !!this.authState()?.token,
  );

  register(
    name: string,
    email: string,
    password: string,
  ): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/register`, {
        name,
        email,
        password,
      })
      .pipe(tap((response) => this.saveAuth(response)));
  }

  login(
    email: string,
    password: string,
  ): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/login`, {
        email,
        password,
      })
      .pipe(tap((response) => this.saveAuth(response)));
  }

  logout(): void {
    this.clearStoredAuth();
    this.authState.set(null);
  }

  getToken(): string | null {
    return this.authState()?.token ?? null;
  }

  private saveAuth(response: AuthResponse): void {
    this.authState.set(response);

    try {
      sessionStorage.setItem(
        this.storageKey,
        JSON.stringify(response),
      );
    } catch {
      // Authentication remains available for the current page session.
      // It will not survive a page reload if storage is unavailable.
    }
  }

  private readStoredAuth(): AuthResponse | null {
    try {
      const storedAuth = sessionStorage.getItem(this.storageKey);

      if (!storedAuth) {
        return null;
      }

      const auth: unknown = JSON.parse(storedAuth);

      if (
        typeof auth !== 'object' ||
        auth === null ||
        !('token' in auth) ||
        !('tokenType' in auth) ||
        !('userId' in auth) ||
        !('name' in auth) ||
        !('email' in auth) ||
        typeof auth.token !== 'string' ||
        !auth.token ||
        typeof auth.tokenType !== 'string' ||
        typeof auth.userId !== 'string' ||
        typeof auth.name !== 'string' ||
        typeof auth.email !== 'string'
      ) {
        this.clearStoredAuth();
        return null;
      }

      return auth as AuthResponse;
    } catch {
      this.clearStoredAuth();
      return null;
    }
  }

  private clearStoredAuth(): void {
    try {
      sessionStorage.removeItem(this.storageKey);
    } catch {
      // Storage may be unavailable in restricted browser environments.
    }
  }
}
