// authentication.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private readonly ACCESS_KEY = 'access_token';
  private readonly REFRESH_KEY = 'refresh_token';
  private readonly USER_KEY = 'helpdeskUser';

  constructor(private http: HttpClient) {}

  /**
   * Accept common shapes from backend:
   * - { token, refreshToken, ... }
   * - { accessToken, refreshToken, ... }
   * - { token, refresh, ... } (legacy)
   */
  login(userWithTokens: { token?: string; accessToken?: string; refreshToken?: string; [k: string]: any }): void {
    // prefer explicit token names, then fallbacks
    const access = userWithTokens.token ?? userWithTokens.accessToken ?? null;
    // use bracket access for potential index-signature property 'refresh' to satisfy TS
    const refresh = userWithTokens.refreshToken ?? userWithTokens['refresh'] ?? null;

    if (access) {
      localStorage.setItem(this.ACCESS_KEY, access);
    }
    if (refresh) {
      localStorage.setItem(this.REFRESH_KEY, refresh);
    }

    // store the whole object (useful if backend returns user DTO too)
    localStorage.setItem(this.USER_KEY, JSON.stringify(userWithTokens));
  }

  logout(): void {
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.ACCESS_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
  }

  // existing accessor
  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_KEY);
  }

  // convenience alias used by your components (keeps existing code working)
  getToken(): string | null {
    return this.getAccessToken();
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  getUser(): any | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  setAccessToken(token: string) {
    localStorage.setItem(this.ACCESS_KEY, token);
  }

  setRefreshToken(token: string) {
    localStorage.setItem(this.REFRESH_KEY, token);
  }

  // quick boolean that avoids decoding if token absent
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  // checks expiry using exp claim in JWT (seconds since epoch)
  hasValidAccessToken(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload?.exp;
      if (!exp) return false;
      const nowSec = Math.floor(Date.now() / 1000);
      // Add small clock skew tolerance (e.g. 30s)
      return exp > nowSec + 30;
    } catch (e) {
      // If any parsing error, treat as invalid
      return false;
    }
  }

  // Call backend to refresh tokens. Returns observable that emits the new tokens.
  refreshToken(): Observable<any> {
    const refresh = this.getRefreshToken();
    if (!refresh) {
      return throwError(() => new Error('No refresh token'));
    }

    // adjust URL and payload to match backend
    return this.http.post<{ accessToken?: string; refreshToken?: string }>('/api/auth/refresh', {
      refreshToken: refresh
    }).pipe(
      tap((res) => {
        // adapt to field names returned by your backend
        if (res?.accessToken) {
          this.setAccessToken(res.accessToken);
        }
        if (res?.refreshToken) {
          this.setRefreshToken(res.refreshToken);
        }
      }),
      catchError(err => {
        // propagate error so caller can handle logout/navigation
        return throwError(() => err);
      })
    );
  }
}
