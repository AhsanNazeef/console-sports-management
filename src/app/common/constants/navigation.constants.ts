import { NavGroup } from '../models/navigation.model';

// Sidebar groups named in the brief. The items follow the backend's modules.
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    id: 'match-management',
    label: 'Match Management',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: 'ic_graph', access: null },
      { label: 'Matches', path: '/matches', icon: 'ic_video', access: null },
      { label: 'Tournaments', path: '/tournaments', icon: 'ic_featured', access: null },
      { label: 'Sports', path: '/sports', icon: 'ic_sport', access: null },
    ],
  },
  {
    id: 'publishing',
    label: 'Publishing',
    items: [
      { label: 'Posts', path: '/posts', icon: 'ic_megaphone', access: null },
      { label: 'Templates', path: '/templates', icon: 'ic_documents', access: null },
      { label: 'Magazines', path: '/magazines', icon: 'ic_image', access: null },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [{ label: 'Payments', path: '/payments', icon: 'ic_payment_request', access: 'viewPayments' }],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { label: 'Users', path: '/users', icon: 'ic_users', access: null },
      { label: 'Configuration', path: '/configuration', icon: 'ic_adjust', access: null },
      { label: 'Requests', path: '/requests', icon: 'ic_pending', access: null },
    ],
  },
];
