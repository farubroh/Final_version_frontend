import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthenticationService } from '../../authentication.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  credentials = { username: '', password: '', isAdmin: false };
  error: string = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthenticationService
  ) {}

handleSubmit(event: Event): void {
  event.preventDefault();
  this.error = '';  // Reset error message

  this.http.post<any>('http://localhost:8085/api/authenticate', this.credentials)
    .subscribe({
      next: (res: any) => {
        console.log(res);
        // // Check if the response contains a user and token
        // if (res && res.token) {
        //   // Store the user and token in session storage or a service
        //   this.authService.login({ ...res.user, token: res.token });

        //   // Based on the user's role, navigate to the appropriate dashboard
        //   const role = res.user.role;
        //   console.log(role);
        //   if (role === 'admin') {
        //     this.router.navigate(['/admin']);  // Admin dashboard route
        //   } else if (role === 'user') {
        //     this.router.navigate(['/dashboard']);  // User dashboard route
        //   } else if (role === 'developer') {
        //     this.router.navigate(['/developer']);  // Developer dashboard route
        //   }
        // } else {
        //   this.error = '❌ Invalid credentials or no token received';
        // }




        if (res && res.token) {
          localStorage.setItem('authToken', res.token);
  this.authService.login({ ...res.user, token: res.token });

  // Navigate to homepage first
  this.router.navigate(['/home']);
} else {
  this.error = '❌ Invalid credentials or no token received';
}

      },
      error: (err) => {
        console.error(err);
        this.error = '❌ Invalid Username or Password';
      }
    });
}


}
