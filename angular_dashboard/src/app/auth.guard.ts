import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthenticationService } from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthenticationService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    // If access token exists and not expired — allow
    if (this.authService.hasValidAccessToken()) {
      return true;
    }

    // If we have a refresh token, try to refresh (async).
    const refreshToken = this.authService.getRefreshToken();
    if (refreshToken) {
      return this.authService.refreshToken().pipe(
        map(() => true),
        catchError(() => {
          this.router.navigate(['/login']);
          return of(false);
        })
      );
    }

    // No valid tokens -> redirect to login
    this.router.navigate(['/login']);
    return false;
  }
}
