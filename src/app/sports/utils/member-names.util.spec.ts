import { userName } from './member-names.util';

describe('userName', () => {
  const user = { id: 'u1', email: 'pat@buzzer.dev', avatarUrl: null };

  it('joins the first and last name', () => {
    expect(userName({ ...user, firstName: 'Pat', lastName: 'Player' })).toBe('Pat Player');
    expect(userName({ ...user, firstName: 'Pat', lastName: null })).toBe('Pat');
  });

  it('falls back to the email when the account has no name', () => {
    expect(userName({ ...user, firstName: null, lastName: null })).toBe('pat@buzzer.dev');
  });
});
