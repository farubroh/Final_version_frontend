import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { JwtInterceptor } from './app/jwt-interceptor.service';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    // let DI-provided interceptors run
    provideHttpClient(withInterceptorsFromDi()),
    // register your class-based interceptor
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
  ],
}).catch(console.error);
