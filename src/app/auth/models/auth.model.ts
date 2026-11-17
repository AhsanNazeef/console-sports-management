// The backend's roles, as GET /auth/me returns them.
export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER' | 'ORG';

// The permission names of GET /users/roles and GET /users/:id/permissions.
export type Permission =
  | 'users:read'
  | 'users:write'
  | 'matches:write'
  | 'payments:read'
  | 'payments:write'
  | 'templates:write'
  | 'config:write'
  | 'requests:approve'
  | 'requests:create'
  | 'organizations:write'
  | 'org:write'
  | 'analytics:read';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// What the signed-in account may do: its permission list (GET /users/:id/permissions), and for an ORG account
// the club it is linked to (GET /organization).
export interface UserAccess {
  permissions: readonly Permission[];
  organisationId: string | null;
}

export interface UserPermissions {
  userId: string;
  role: UserRole;
  permissions: Permission[];
}

// The club an ORG account is linked to (GET /organization); only its id is read.
export interface LinkedOrganisation {
  id: string;
}
