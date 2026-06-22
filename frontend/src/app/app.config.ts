import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withNavigationErrorHandler, NavigationError } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';

// If a lazy route chunk fails to load (e.g. a stale bundle still running after new
// routes were added), the router silently reverts to the current URL. Detect that
// failure and force a clean reload of the attempted URL so navigation self-heals
// instead of bouncing the user back to where they were.
function onNavigationError(event: NavigationError): void {
  const msg = String((event.error as { message?: string })?.message ?? event.error ?? '');
  const isChunkError = /ChunkLoadError|dynamically imported module|Failed to fetch/i.test(msg);
  if (isChunkError && event.url) {
    window.location.assign(event.url);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withNavigationErrorHandler(onNavigationError),
    ),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimationsAsync(),
  ],
};
