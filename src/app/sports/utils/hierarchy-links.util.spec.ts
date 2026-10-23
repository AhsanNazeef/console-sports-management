import { governingBodyLink, organisationLink, participantLink, sportLink } from './hierarchy-links.util';

describe('hierarchy links', () => {
  it('nests each level under its parent', () => {
    expect(sportLink('s')).toBe('/sports/s');
    expect(governingBodyLink('s', 'g')).toBe('/sports/s/governing-bodies/g');
    expect(organisationLink('s', 'g', 'o')).toBe('/sports/s/governing-bodies/g/organisations/o');
    expect(participantLink('s', 'g', 'o', 'p')).toBe('/sports/s/governing-bodies/g/organisations/o/participants/p');
  });
});
