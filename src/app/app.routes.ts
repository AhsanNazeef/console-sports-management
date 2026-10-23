import { Type } from '@angular/core';
import { Routes } from '@angular/router';
import { ShellComponent } from './common/components/shell/shell.component';

const comingSoon = (): Promise<Type<unknown>> =>
  import('./common/components/coming-soon/coming-soon.component').then((m) => m.ComingSoonPage);

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', title: 'Dashboard', loadComponent: comingSoon },
      { path: 'matches', title: 'Live Matches', loadComponent: comingSoon },
      { path: 'tournaments', title: 'Tournaments', loadComponent: comingSoon },
      { path: 'sports', title: 'Sport Management', loadComponent: comingSoon },
      { path: 'posts', title: 'Posts', loadComponent: comingSoon },
      { path: 'templates', title: 'Templates', loadComponent: comingSoon },
      { path: 'magazines', title: 'Magazines', loadComponent: comingSoon },
      { path: 'transactions', title: 'Transactions', loadComponent: comingSoon },
      { path: 'finance-summary', title: 'Finance Summary', loadComponent: comingSoon },
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
