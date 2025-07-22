import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError, from, Observable } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  // Add auth token to request if available
  const authToken = authService.accessToken();
  
  if (authToken) {
    req = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${authToken}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized errors
      if (error.status === 401) {
        return handleUnauthorizedError(req, next, authService);
      }
      
      return throwError(() => error);
    })
  );
};

/**
 * Handle 401 Unauthorized errors by attempting token refresh
 */
function handleUnauthorizedError(request: HttpRequest<any>, next: HttpHandlerFn, authService: AuthService): Observable<any> {
  // Check if this is a refresh token request to avoid infinite loop
  if (request.url.includes('/auth/refresh')) {
    // This is a refresh token request that failed, logout user
    authService.logout();
    return throwError(() => new Error('Session expired'));
  }

  // Try to refresh the token
  return from(authService.refreshAccessToken()).pipe(
    switchMap(newToken => {
      if (newToken) {
        // Retry the original request with new token
        const retryRequest = request.clone({
          setHeaders: {
            'Authorization': `Bearer ${newToken}`
          }
        });
        return next(retryRequest);
      } else {
        // Token refresh failed, logout user
        authService.logout();
        return throwError(() => new Error('Session expired'));
      }
    }),
    catchError(error => {
      // Token refresh failed, logout user
      authService.logout();
      return throwError(() => error);
    })
  );
}