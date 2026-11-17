import { Type } from '@angular/core';
import { Routes } from '@angular/router';
import { AccessAction } from './auth/constants/access.constants';
import { authRoutes } from './auth/auth.routes';
import { ShellComponent } from './common/components/shell/shell.component';
import { NAV_GROUPS } from './common/constants/navigation.constants';
import { accessGuard } from './core/auth/guards/access.guard';
import { authGuard } from './core/auth/guards/auth.guard';

const comingSoon = (): Promise<Type<unknown>> =>
  import('./common/components/coming-soon/coming-soon.component').then((m) => m.ComingSoonPage);

// A page's access rule comes from its sidebar item, so the sidebar and accessGuard can't disagree.
function navAccess(path: string): { access: AccessAction | null } {
  const item = NAV_GROUPS.flatMap((group) => group.items).find((navItem) => navItem.path === path);
  return { access: item?.access ?? null };
}

export const routes: Routes = [
  ...authRoutes,
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    canActivateChild: [accessGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', title: 'Dashboard', data: navAccess('/dashboard'), loadComponent: comingSoon },
      {
        path: 'matches',
        title: 'Matches',
        data: navAccess('/matches'),
        loadChildren: () => import('./matches/matches.routes').then((m) => m.matchesRoutes),
      },
      { path: 'tournaments', title: 'Tournaments', data: navAccess('/tournaments'), loadComponent: comingSoon },
      {
        path: 'sports',
        title: 'Sport Management',
        data: navAccess('/sports'),
        loadChildren: () => import('./sports/sports.routes').then((m) => m.sportsRoutes),
      },
      { path: 'posts', title: 'Posts', data: navAccess('/posts'), loadComponent: comingSoon },
      { path: 'templates', title: 'Templates', data: navAccess('/templates'), loadComponent: comingSoon },
      { path: 'magazines', title: 'Magazines', data: navAccess('/magazines'), loadComponent: comingSoon },
      {
        path: 'payments',
        title: 'Payments',
        data: navAccess('/payments'),
        loadComponent: () => import('./payments/payment-list/payment-list.component').then((m) => m.PaymentListPage),
      },
      { path: 'users', title: 'Users', data: navAccess('/users'), loadComponent: comingSoon },
      {
        path: 'configuration',
        title: 'System Configuration',
        data: navAccess('/configuration'),
        loadComponent: comingSoon,
      },
      { path: 'requests', title: 'Requests', data: navAccess('/requests'), loadComponent: comingSoon },
      {
        path: 'design-system',
        title: 'Design System',
        loadComponent: () => import('./design-system/design-system.component').then((m) => m.DesignSystemPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
