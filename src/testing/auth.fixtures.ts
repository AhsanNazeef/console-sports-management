// Test helpers: the four demo accounts with the permission lists GET /users/:id/permissions returns for them (the
// same table as GET /users/roles), and a stand-in AuthService that runs the console's real access rules.
import { signal } from '@angular/core';
import { ACCESS_RULES, AccessAction } from '../app/auth/constants/access.constants';
import { AuthUser, Permission, UserAccess, UserRole } from '../app/auth/models/auth.model';
import { AccessContext, canPerform } from '../app/core/auth/utils/access.util';

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  ADMIN: [
    'users:read',
    'users:write',
    'matches:write',
    'payments:read',
    'payments:write',
    'templates:write',
    'config:write',
    'requests:approve',
    'organizations:write',
    'analytics:read',
  ],
  OPERATOR: [
    'users:read',
    'matches:write',
    'payments:read',
    'templates:write',
    'requests:create',
    'organizations:write',
    'analytics:read',
  ],
  VIEWER: ['users:read', 'payments:read', 'analytics:read', 'requests:create'],
  ORG: ['users:read', 'org:write', 'analytics:read', 'requests:create'],
};

export const ROLES: readonly UserRole[] = ['ADMIN', 'OPERATOR', 'VIEWER', 'ORG'];

// Every action the console's access rules define, so a new rule is covered by the specs that loop over it.
export const ACTIONS = Object.keys(ACCESS_RULES) as AccessAction[];

export function demoUser(role: UserRole): AuthUser {
  return { id: `${role.toLowerCase()}-id`, email: `${role.toLowerCase()}@buzzer.dev`, role };
}

export function demoAccess(role: UserRole, organisationId: string | null = null): UserAccess {
  return { permissions: ROLE_PERMISSIONS[role], organisationId };
}

// What a page needs from AuthService, signed in as a demo account (an ORG account linked to organisationId). Specs that
// render the shell add signOut.
export function authServiceAs(role: UserRole, organisationId: string | null = null) {
  const user = demoUser(role);
  const access = demoAccess(role, organisationId);
  return {
    currentUser: signal<AuthUser | null>(user),
    accessError: signal(null),
    can: (action: AccessAction, context?: AccessContext): boolean => canPerform(action, user, access, context),
  };
}
