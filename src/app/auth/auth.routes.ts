import { Routes } from '@angular/router';
import { homeGuard } from '../core/auth/guards/home.guard';

export const authRoutes: Routes = [
  {
    path: 'login',
    title: 'Log in',
    canActivate: [homeGuard],
    loadComponent: () => import('./login/login.component').then((m) => m.LoginPage),
  },
];
