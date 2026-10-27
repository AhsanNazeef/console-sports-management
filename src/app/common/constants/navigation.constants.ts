import { NavGroup } from '../models/navigation.model';

// Sidebar groups named in the brief. The items follow the backend's modules.
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    id: 'match-management',
    label: 'Match Management',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: 'ic_graph' },
      { label: 'Matches', path: '/matches', icon: 'ic_video' },
      { label: 'Tournaments', path: '/tournaments', icon: 'ic_featured' },
      { label: 'Sports', path: '/sports', icon: 'ic_sport' },
    ],
  },
  {
    id: 'publishing',
    label: 'Publishing',
    items: [
      { label: 'Posts', path: '/posts', icon: 'ic_megaphone' },
      { label: 'Templates', path: '/templates', icon: 'ic_documents' },
      { label: 'Magazines', path: '/magazines', icon: 'ic_image' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [{ label: 'Payments', path: '/payments', icon: 'ic_payment_request' }],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { label: 'Users', path: '/users', icon: 'ic_users' },
      { label: 'Configuration', path: '/configuration', icon: 'ic_adjust' },
      { label: 'Requests', path: '/requests', icon: 'ic_pending' },
    ],
  },
];
