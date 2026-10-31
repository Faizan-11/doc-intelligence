
import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthService } from './auth';
import { authInterceptor } from './auth.interceptor';

describe('AuthInterceptor', () => {
  let http: HttpClient;
  let httpTestingController: HttpTestingController;
  let authService: {
    getToken: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let router: Router;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    authService = {
      getToken: vi.fn().mockReturnValue('test-jwt-token'),
      logout: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withInterceptors([authInterceptor]),
        ),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should clear authentication and redirect to login when a protected request returns 401', () => {
    let receivedError: unknown;

    http.get('http://localhost:8080/api/documents').subscribe({
      error: (error) => {
        receivedError = error;
      },
    });

    const request = httpTestingController.expectOne(
      'http://localhost:8080/api/documents',
    );

    expect(request.request.headers.get('Authorization'))
      .toBe('Bearer test-jwt-token');

    request.flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(authService.logout).toHaveBeenCalledOnce();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    expect(receivedError).toBeTruthy();
  });

  it('should not log out or redirect when a login request returns 401', () => {
    let receivedError: unknown;

    http.post(
      'http://localhost:8080/api/auth/login',
      { email: 'test@example.com', password: 'wrong-password' },
    ).subscribe({
      error: (error) => {
        receivedError = error;
      },
    });

    const request = httpTestingController.expectOne(
      'http://localhost:8080/api/auth/login',
    );

    request.flush(
      { message: 'Invalid credentials' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(authService.logout).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(receivedError).toBeTruthy();
  });
});
