import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { JwtInterceptor } from './jwt-interceptor.service';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),

    // ✅ Register JwtInterceptor correctly
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true
    },

    // ✅ Registering Circle Progress Module globally
    importProvidersFrom(
      NgCircleProgressModule.forRoot({
        radius: 60,
        outerStrokeWidth: 10,
        innerStrokeWidth: 5,
        outerStrokeColor: "#4882c2",
        innerStrokeColor: "#e7e8ea",
        animationDuration: 1000,
        showUnits: true,
        showSubtitle: false,
        titleFontSize: '18',
        unitsFontSize: '16'
      })
    )
  ]
};
