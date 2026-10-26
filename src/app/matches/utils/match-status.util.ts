import { MATCH_STATUS_ACTIONS, MATCH_STATUS_TRANSITIONS, MatchStatusTarget } from '../constants/matches.constants';
import { MatchStatus } from '../models/match.model';

export interface MatchStatusAction {
  status: MatchStatusTarget;
  label: string;
  confirm: boolean;
}

// The status buttons a match shows: only the moves the backend allows from its current status, so none answers 400.
export function matchStatusActions(status: MatchStatus): MatchStatusAction[] {
  return MATCH_STATUS_TRANSITIONS[status].map((next) => ({ status: next, ...MATCH_STATUS_ACTIONS[next] }));
}
