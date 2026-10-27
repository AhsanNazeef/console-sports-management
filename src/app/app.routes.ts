import { Type } from '@angular/core';
import { Routes } from '@angular/router';
import { authRoutes } from './auth/auth.routes';
import { ShellComponent } from './common/components/shell/shell.component';
import { authGuard } from './core/auth/guards/auth.guard';

const comingSoon = (): Promise<Type<unknown>> =>
  import('./common/components/coming-soon/coming-soon.component').then((m) => m.ComingSoonPage);

export const routes: Routes = [
  ...authRoutes,
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', title: 'Dashboard', loadComponent: comingSoon },
      {
        path: 'matches',
        title: 'Matches',
        loadChildren: () => import('./matches/matches.routes').then((m) => m.matchesRoutes),
      },
      { path: 'tournaments', title: 'Tournaments', loadComponent: comingSoon },
      {
        path: 'sports',
        title: 'Sport Management',
        loadChildren: () => import('./sports/sports.routes').then((m) => m.sportsRoutes),
      },
      { path: 'posts', title: 'Posts', loadComponent: comingSoon },
      { path: 'templates', title: 'Templates', loadComponent: comingSoon },
      { path: 'magazines', title: 'Magazines', loadComponent: comingSoon },
      {
        path: 'payments',
        title: 'Payments',
        loadComponent: () => import('./payments/payment-list/payment-list.component').then((m) => m.PaymentListPage),
      },
      { path: 'users', title: 'Users', loadComponent: comingSoon },
      { path: 'configuration', title: 'System Configuration', loadComponent: comingSoon },
      { path: 'requests', title: 'Requests', loadComponent: comingSoon },
      {
        path: 'design-system',
        title: 'Design System',
        loadComponent: () => import('./design-system/design-system.component').then((m) => m.DesignSystemPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
