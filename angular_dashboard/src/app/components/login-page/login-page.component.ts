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

    this.http.post<any>(
      `${this.AUTH_URL}/login`,
      payload
    ).subscribe({
      next: (res: any) => {
        if (res && res.accessToken) {
          localStorage.setItem('accessToken',  res.accessToken);
          localStorage.setItem('refreshToken', res.refreshToken ?? '');
          localStorage.setItem('userId',       res.userId       ?? '');
          localStorage.setItem('name',         res.name         ?? '');
          localStorage.setItem('eduEmail',     res.eduEmail     ?? '');
          localStorage.setItem('personalEmail',res.personalEmail ?? '');
          localStorage.setItem('isStudent',    String(res.isStudent));

          if (res.isStudent) {
            // Student: store flat fields
            localStorage.setItem('deptShortName',    res.deptShortName    ?? '');
            localStorage.setItem('deptLongName',     res.deptLongName     ?? '');
            localStorage.setItem('programShortName', res.programShortName ?? '');
            localStorage.setItem('programLongName',  res.programLongName  ?? '');
            localStorage.setItem('roleName',         res.roleName         ?? '');
          } else {
            // Employee: store full roleInfo array as JSON
            localStorage.setItem('roleInfo', JSON.stringify(res.roleInfo ?? []));
          }

          this.authService.login({
            token: res.accessToken,
            refreshToken: res.refreshToken ?? null,
          });

          this.router.navigate(['/home']);
        } else {
          this.error = '❌ Invalid credentials or no token received';
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
