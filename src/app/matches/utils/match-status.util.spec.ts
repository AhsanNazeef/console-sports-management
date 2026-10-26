import { matchStatusActions } from './match-status.util';

describe('matchStatusActions', () => {
  const buttons = (status: Parameters<typeof matchStatusActions>[0]): string[] =>
    matchStatusActions(status).map((action) => action.label);

  it('lets a scheduled match start or be cancelled', () => {
    expect(matchStatusActions('SCHEDULED')).toEqual([
      { status: 'LIVE', label: 'Start Match', confirm: false },
      { status: 'CANCELLED', label: 'Cancel Match', confirm: true },
    ]);
  });

  it('lets a live match finish or be cancelled, both after confirmation', () => {
    expect(matchStatusActions('LIVE')).toEqual([
      { status: 'FINISHED', label: 'Finish Match', confirm: true },
      { status: 'CANCELLED', label: 'Cancel Match', confirm: true },
    ]);
  });

  it('shows no buttons once a match is finished or cancelled', () => {
    expect(buttons('FINISHED')).toEqual([]);
    expect(buttons('CANCELLED')).toEqual([]);
  });

  it('never offers going back to scheduled', () => {
    for (const status of ['SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED'] as const) {
      expect(matchStatusActions(status).map((action) => action.status)).not.toContain('SCHEDULED');
    }
  });
});
