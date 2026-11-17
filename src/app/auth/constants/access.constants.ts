import { Permission, UserRole } from '../models/auth.model';

// The pages and actions the console shows or hides by account.
export type AccessAction =
  'viewPayments' | 'manageCatalogue' | 'manageMembers' | 'manageMatches' | 'changePaymentStatus';

interface AccessRule {
  // The roles the backend route lets through; any other role gets 403 "Insufficient role".
  roles: readonly UserRole[];
  // Where the permission list agrees with the route, one of these must be in it too.
  anyPermission?: readonly Permission[];
  // ORG accounts may only act on the club they are linked to (GET /organization).
  ownOrganisationOnly?: boolean;
}

// A page or action shows only when the role passes and, where given, the permission list allows it, so no button
// ends in a 403.
export const ACCESS_RULES: Record<AccessAction, AccessRule> = {
  // GET /payments/summary and /payments/transactions answer every role, but only ADMIN, OPERATOR and VIEWER have
  // payments:read in GET /users/roles.
  viewPayments: { roles: ['ADMIN', 'OPERATOR', 'VIEWER', 'ORG'], anyPermission: ['payments:read'] },
  // POST, PATCH and DELETE on /organizations/sports, /governing-bodies, /organizations, /teams and /players.
  manageCatalogue: { roles: ['ADMIN', 'OPERATOR'], anyPermission: ['organizations:write'] },
  // POST /organizations/:id/squad and /organizations/:id/staff, PATCH and DELETE /squad/:id and /staff/:id
  // ("ADMIN/ORG"), so OPERATOR's organizations:write doesn't cover them.
  manageMembers: {
    roles: ['ADMIN', 'ORG'],
    anyPermission: ['organizations:write', 'org:write'],
    ownOrganisationOnly: true,
  },
  // POST /matches, PATCH and DELETE /matches/:id, PATCH /matches/:id/status and POST /matches/:id/events.
  manageMatches: { roles: ['ADMIN', 'OPERATOR'], anyPermission: ['matches:write'] },
  // PATCH /payments/transactions/:id/status ("admin/operator"). GET /users/roles gives payments:write to ADMIN only,
  // so this rule checks the role alone.
  changePaymentStatus: { roles: ['ADMIN', 'OPERATOR'] },
};
