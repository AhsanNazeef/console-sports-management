import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { AccessAction } from '../../../auth/constants/access.constants';
import { HOME_PATH } from '../../../auth/constants/auth.constants';
import { AuthService } from '../services/auth.service';

// Sends an account away from a page whose access rule (the route's data.access) it doesn't pass, to the dashboard.
// It runs after authGuard, so the account's access has loaded; without it, no page that needs access opens.
export const accessGuard: CanActivateChildFn = (childRoute) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const access = childRoute.data['access'] as AccessAction | null | undefined;
  return !access || authService.can(access) ? true : router.createUrlTree([HOME_PATH]);
};
