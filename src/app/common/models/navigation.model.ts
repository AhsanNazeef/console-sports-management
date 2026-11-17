import { AccessAction } from '../../auth/constants/access.constants';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  // The access rule an account must pass to see the item and open its page; null for every signed-in account.
  access: AccessAction | null;
}

export interface NavGroup {
  id: string;
  label: string;
  items: readonly NavItem[];
}
