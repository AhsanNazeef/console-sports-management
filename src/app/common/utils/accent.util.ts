import { ACCENT_COLORS } from '../constants/palette.constants';

// Picks an accent from the palette for a key (usually an id), so the same entity always gets the same colour.
export function accentFor(key: string): string {
  const hash = [...key].reduce((sum, char) => sum + (char.codePointAt(0) ?? 0), 0);
  return ACCENT_COLORS[hash % ACCENT_COLORS.length];
}
