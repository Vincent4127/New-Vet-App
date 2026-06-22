import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Redirect already-logged-in users away from the login page */
export const loginRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return true;
  if (auth.isAdmin()) return router.createUrlTree(['/admin/dashboard']);
  return router.createUrlTree(['/app/home']);
};
