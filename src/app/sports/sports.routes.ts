import { Routes } from '@angular/router';

export const sportsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./sport-list/sport-list.component').then((m) => m.SportListPage),
  },
];
