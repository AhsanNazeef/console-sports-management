import { ACTIONS, demoAccess, demoUser, ROLE_PERMISSIONS, ROLES } from '../../../../testing/auth.fixtures';
import { AccessAction } from '../../../auth/constants/access.constants';
import { Permission, UserAccess, UserRole } from '../../../auth/models/auth.model';
import { canPerform } from './access.util';

const OWN_CLUB = 'club-own';

// The demo account's live permission list; an ORG account is linked to OWN_CLUB unless given another club.
function accessOf(role: UserRole, organisationId: string | null = role === 'ORG' ? OWN_CLUB : null): UserAccess {
  return demoAccess(role, organisationId);
}

function allowed(role: UserRole, clubId = OWN_CLUB, access = accessOf(role)): AccessAction[] {
  return ACTIONS.filter((action) => canPerform(action, { role }, access, { organisationId: clubId }));
}

describe('canPerform', () => {
  it('lets ADMIN do everything, on its own club and any other', () => {
    expect(allowed('ADMIN')).toEqual(ACTIONS);
    expect(allowed('ADMIN', 'another-club')).toEqual(ACTIONS);
  });

  it('lets OPERATOR see payments and manage the catalogue, matches and payment statuses, but not squads and staff', () => {
    const expected: AccessAction[] = ['viewPayments', 'manageCatalogue', 'manageMatches', 'changePaymentStatus'];
    expect(allowed('OPERATOR')).toEqual(expected);
    expect(allowed('OPERATOR', 'another-club')).toEqual(expected);
  });

  it('lets VIEWER only see payments', () => {
    expect(allowed('VIEWER')).toEqual(['viewPayments']);
  });

  it('lets ORG manage only its own club’s squad and staff, and not see payments', () => {
    expect(allowed('ORG')).toEqual(['manageMembers']);
    expect(allowed('ORG', 'another-club')).toEqual([]);
  });

  it('lets an ORG account that is linked to no club manage no squad', () => {
    expect(allowed('ORG', OWN_CLUB, accessOf('ORG', null))).toEqual([]);
    expect(canPerform('manageMembers', { role: 'ORG' }, accessOf('ORG', null))).toBe(false);
  });

  it('allows nothing before the user and their permissions are known', () => {
    for (const role of ROLES) {
      for (const action of ACTIONS) {
        expect(canPerform(action, null, accessOf(role), { organisationId: OWN_CLUB }), `${role} ${action}`).toBe(false);
        expect(canPerform(action, demoUser(role), null, { organisationId: OWN_CLUB }), `${role} ${action}`).toBe(false);
      }
    }
  });

  it('allows nothing to a role the rules don’t list, whatever its permission list', () => {
    const role = 'SUPERUSER' as UserRole;
    const access: UserAccess = { permissions: ROLE_PERMISSIONS.ADMIN, organisationId: OWN_CLUB };
    expect(allowed(role, OWN_CLUB, access)).toEqual([]);
  });

  it('follows the permission list where a rule has one: a listed role without the permission is denied', () => {
    const without = (role: UserRole, permission: Permission): UserAccess => ({
      ...accessOf(role),
      permissions: ROLE_PERMISSIONS[role].filter((name) => name !== permission),
    });
    expect(canPerform('manageMatches', { role: 'OPERATOR' }, without('OPERATOR', 'matches:write'))).toBe(false);
    expect(canPerform('manageCatalogue', { role: 'OPERATOR' }, without('OPERATOR', 'organizations:write'))).toBe(false);
    expect(canPerform('viewPayments', { role: 'ADMIN' }, without('ADMIN', 'payments:read'))).toBe(false);
    const orgWithoutWrite = without('ORG', 'org:write');
    expect(canPerform('manageMembers', { role: 'ORG' }, orgWithoutWrite, { organisationId: OWN_CLUB })).toBe(false);
  });

  it('checks the role alone for payment status changes', () => {
    const noPermissions: UserAccess = { permissions: [], organisationId: null };
    expect(canPerform('changePaymentStatus', { role: 'OPERATOR' }, noPermissions)).toBe(true);
    expect(canPerform('changePaymentStatus', { role: 'VIEWER' }, accessOf('ADMIN'))).toBe(false);
  });
});
