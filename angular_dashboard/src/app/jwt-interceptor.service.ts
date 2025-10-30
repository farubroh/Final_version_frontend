import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, filter, switchMap, take, finalize } from 'rxjs/operators';
import { AuthenticationService } from './authentication.service';
import { Router } from '@angular/router';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  constructor(private auth: AuthenticationService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.getAccessToken();
    const looksLikeJwt = !!token && token !== 'null' && token !== 'undefined' && token.split('.').length === 3;

    let cloned = req;
    if (looksLikeJwt) {
      cloned = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
      // Optional: console.log('[JwtInterceptor] attached token to:', req.url);
    } else {
      // Optional: console.log('[JwtInterceptor] skipping token for:', req.url, 'token=', token);
    }

    return next.handle(cloned).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          // Attempt refresh flow
          return this.handle401Error(cloned, next);
        }
        return throwError(() => err);
      })
    );
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // If already refreshing, wait for the new token then retry
    if (this.isRefreshing) {
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap((token) => {
          const cloned = request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
          return next.handle(cloned);
        })
      );
    }

    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    return this.auth.refreshToken().pipe(
      switchMap((res) => {
        const newAccess = this.auth.getAccessToken();
        this.refreshTokenSubject.next(newAccess);
        const cloned = request.clone({ setHeaders: { Authorization: `Bearer ${newAccess}` } });
        return next.handle(cloned);
      }),
      catchError(err => {
        // Refresh failed -> logout and navigate to login
        this.auth.logout();
        this.router.navigate(['/login']);
        return throwError(() => err);
      }),
      finalize(() => {
        this.isRefreshing = false;
      })
    );
  }
}
