import { Routes } from '@angular/router';

// Links to a match use skipLocationChange, so the address bar keeps showing /matches (no ids in addresses).
export const matchesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./match-list/match-list.component').then((m) => m.MatchListPage),
  },
  {
    path: ':matchId',
    loadComponent: () => import('./match-detail/match-detail.component').then((m) => m.MatchDetailPage),
  },
];
