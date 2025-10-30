import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from '../../authentication.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register-page.component.html',
  styleUrls: ['./register-page.component.css'] // reuse login css or add new small rules
})
export class RegisterPageComponent {
  // Registration payload shape — adapt to your backend RegisterPayload
  payload = {
    userId: '',
    password: '',
    email: '',
    roleId: 3 // default to User
  };

  confirmPassword: string = '';
  error: string = '';
  success: string = '';
  isSubmitting = false;

  private readonly AUTH_URL = 'http://localhost:8085/api/auth';

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthenticationService // optional, in case you want to auto-login later
  ) {}

  handleSubmit(event: Event): void {
    event.preventDefault();
    this.error = '';
    this.success = '';

    if (!this.payload.userId || !this.payload.password || !this.payload.email) {
      this.error = 'Please fill all required fields';
      return;
    }
    if (this.payload.password !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    this.isSubmitting = true;

    // Register API expected to return RegisterResponse { userId, roleId } - adapt if different
    this.http.post<{ userId?: any; roleId?: any }>(`${this.AUTH_URL}/register`, this.payload)
      .subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.success = 'Registration successful. Redirecting to login...';
          // small delay to show success then navigate
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 800);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Registration error', err);
          // show backend message if present
          this.error = err?.error?.message || err?.message || 'Registration failed';
        }
      });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
