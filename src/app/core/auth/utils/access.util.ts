import { ACCESS_RULES, AccessAction } from '../../../auth/constants/access.constants';
import { AuthUser, UserAccess } from '../../../auth/models/auth.model';

export interface AccessContext {
  // The club an action concerns, for actions limited to an ORG account's own club.
  organisationId?: string;
}

// Whether the signed-in user may take an action, by role, permission list and (for ORG) their own club.
// Without a user or a loaded permission list, nothing is allowed.
export function canPerform(
  action: AccessAction,
  user: Pick<AuthUser, 'role'> | null,
  access: UserAccess | null,
  context: AccessContext = {}
): boolean {
  const rule = ACCESS_RULES[action];
  if (!user || !access || !rule.roles.includes(user.role)) {
    return false;
  }
  if (rule.anyPermission && !rule.anyPermission.some((permission) => access.permissions.includes(permission))) {
    return false;
  }
  if (rule.ownOrganisationOnly && user.role === 'ORG') {
    return !!access.organisationId && access.organisationId === context.organisationId;
  }
  return true;
}
