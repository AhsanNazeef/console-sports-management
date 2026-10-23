import { ACCENT_COLORS } from '../constants/palette.constants';
import { accentFor } from './accent.util';

describe('accentFor', () => {
  it('always gives the same palette colour for the same key', () => {
    const accent = accentFor('65553c7f-b990-44bd-85a1-cd840af730af');
    expect(ACCENT_COLORS).toContain(accent);
    expect(accentFor('65553c7f-b990-44bd-85a1-cd840af730af')).toBe(accent);
  });
});
