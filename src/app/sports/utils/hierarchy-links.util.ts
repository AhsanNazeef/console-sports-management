// Addresses of the drill-down pages. Each level sits under its parent, so the URL carries the whole path.
export function sportLink(sportId: string): string {
  return `/sports/${sportId}`;
}

export function governingBodyLink(sportId: string, governingBodyId: string): string {
  return `${sportLink(sportId)}/governing-bodies/${governingBodyId}`;
}

export function organisationLink(sportId: string, governingBodyId: string, organisationId: string): string {
  return `${governingBodyLink(sportId, governingBodyId)}/organisations/${organisationId}`;
}

export function participantLink(
  sportId: string,
  governingBodyId: string,
  organisationId: string,
  participantId: string
): string {
  return `${organisationLink(sportId, governingBodyId, organisationId)}/participants/${participantId}`;
}
