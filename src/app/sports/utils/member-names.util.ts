import { UserSummary } from '../models/member.model';

// A user's full name, or their email when the account has no name.
export function userName(user: UserSummary): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
}
