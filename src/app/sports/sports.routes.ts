import { Routes } from '@angular/router';

// The drill-down: each level's route sits under its parent's, and the route ids reach the pages as inputs.
// Links into it use skipLocationChange, so the address bar keeps showing /sports and a refresh returns to the
// catalogue.
export const sportsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./sport-list/sport-list.component').then((m) => m.SportListPage),
  },
  {
    path: ':sportId',
    loadComponent: () => import('./sport-detail/sport-detail.component').then((m) => m.SportDetailPage),
  },
  {
    path: ':sportId/governing-bodies/:governingBodyId',
    loadComponent: () =>
      import('./governing-body-detail/governing-body-detail.component').then((m) => m.GoverningBodyDetailPage),
  },
  {
    path: ':sportId/governing-bodies/:governingBodyId/organisations/:organisationId',
    loadComponent: () =>
      import('./organisation-detail/organisation-detail.component').then((m) => m.OrganisationDetailPage),
  },
  {
    path: ':sportId/governing-bodies/:governingBodyId/organisations/:organisationId/participants/:participantId',
    loadComponent: () =>
      import('./participant-detail/participant-detail.component').then((m) => m.ParticipantDetailPage),
  },
];
