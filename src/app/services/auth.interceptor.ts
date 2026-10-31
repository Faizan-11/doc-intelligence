
import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';

import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();

  const backendUrl = 'http:' + '//localhost:8080/api/';

  if (!req.url.startsWith(backendUrl)) {
    return next(req);
  }

  const isAuthRequest = req.url.includes('/auth/');

  const authenticatedRequest = token
    ? req.clone({
        setHeaders: {
          Authorization: 'Bearer ' + token,
        },
      })
    : req;

  return next(authenticatedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status === 401 &&
        token &&
        !isAuthRequest
      ) {
        authService.logout();
        void router.navigate(['/login']);
      }

      return throwError(() => error);
    }),
  );
};
