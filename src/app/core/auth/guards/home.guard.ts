import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HOME_PATH } from '../../../auth/constants/auth.constants';
import { AuthService } from '../services/auth.service';

// Keeps signed-in users off the login page.
export const homeGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.hasSession() ? router.createUrlTree([HOME_PATH]) : true;
};
