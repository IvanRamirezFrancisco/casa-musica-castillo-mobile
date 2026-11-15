import { bootstrapApplication } from '@angular/platform-browser';
import { inject, provideAppInitializer } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { authInterceptor } from './app/core/security/auth.interceptor';
import { publicDemoInterceptor } from './app/core/security/public-demo.interceptor';
import { productionCommerceInterceptor } from './app/core/security/production-commerce.interceptor';
import { BACKEND_SESSION_ENABLED } from './app/core/config/backend-session.token';
import { AuthService } from './app/core/services/auth.service';

bootstrapApplication(AppComponent, {
  providers: [
    provideAppInitializer(() => {
      if (inject(BACKEND_SESSION_ENABLED)) void inject(AuthService).restore();
    }),
    provideHttpClient(withInterceptors([publicDemoInterceptor, productionCommerceInterceptor, authInterceptor])),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // TT-04: API 36 exposed focus retained inside the hidden Home view.
    provideIonicAngular({ focusManagerPriority: ['heading', 'content'] }),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
  ],
});
