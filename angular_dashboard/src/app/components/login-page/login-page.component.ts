// login-page.ts
import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthenticationService } from '../../authentication.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.css']
})
export class LoginPageComponent {
  // keep credentials simple; backend expects userId/password
  credentials = { username: '', password: '', isAdmin: false };
  error: string = '';

  // base URL for backend auth endpoints (adjust if needed)
  private readonly AUTH_URL = 'http://localhost:8085/api/auth';

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthenticationService
  ) { }

  handleSubmit(event: Event): void {
    event.preventDefault();
    this.error = '';

    // map username -> userId as backend expects
    const payload = {
      userId: this.credentials.username,
      password: this.credentials.password
    };

    this.http.post<{ accessToken?: string; refreshToken?: string }>(
      `${this.AUTH_URL}/login`,
      payload
    ).subscribe({
      next: (res) => {
        // backend returns accessToken and refreshToken (AuthenticationResponse)
        console.log(res);
        if (res && res.accessToken) {
          // normalize shape expected by AuthenticationService.login()
          const userWithTokens: any = {
            token: res.accessToken,
            refreshToken: res.refreshToken ?? null,
            // optional: if you want to keep a small user object you could parse token or request user info
          };

          // AuthenticationService will persist tokens (access_token / refresh_token) and user data
          this.authService.login(userWithTokens);

          // navigate to home after login
          this.router.navigate(['/home']);
        } else {
          this.error = '❌ Invalid credentials or no token received';
          console.error('Login response missing accessToken:', res);
        }
      },
      error: (err) => {
        console.error('Login error:', err);
        // if backend returns 401/400 you can show different messages; keep generic for now
        this.error = '❌ Invalid Username or Password';
      }
    });
  }
}
