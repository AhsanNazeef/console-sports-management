export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

export interface NavGroup {
  id: string;
  label: string;
  items: readonly NavItem[];
}
