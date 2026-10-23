import { parseSportImport } from './sport-import.util';

describe('parseSportImport', () => {
  it('reads a CSV file by its header, with quoted fields and blank lines', () => {
    const csv = [
      '\uFEFFName,Description,Icon URL',
      'Padel,"Played in pairs, on a glass court",https://example.com/padel.png',
      '',
      '"Rugby ""Sevens""","Two halves,',
      'seven minutes each",',
      'Squash,,',
    ].join('\r\n');
    const parsed = parseSportImport('sports.csv', csv);
    expect(parsed.error).toBeNull();
    expect(parsed.rows).toEqual([
      {
        row: 1,
        sport: {
          name: 'Padel',
          description: 'Played in pairs, on a glass court',
          iconUrl: 'https://example.com/padel.png',
        },
      },
      { row: 2, sport: { name: 'Rugby "Sevens"', description: 'Two halves,\r\nseven minutes each' } },
      { row: 3, sport: { name: 'Squash' } },
    ]);
  });

  it('keeps rows without a name so the server can reject them', () => {
    const parsed = parseSportImport('sports.csv', 'name,description\n,Only a description\n');
    expect(parsed.rows).toEqual([{ row: 1, sport: { name: '', description: 'Only a description' } }]);
  });

  it('reads a JSON list of sports', () => {
    const json = JSON.stringify([{ name: 'Padel', iconUrl: 'https://example.com/p.png' }, { name: ' Squash ' }, 42]);
    expect(parseSportImport('SPORTS.JSON', json).rows).toEqual([
      { row: 1, sport: { name: 'Padel', iconUrl: 'https://example.com/p.png' } },
      { row: 2, sport: { name: 'Squash' } },
      { row: 3, sport: { name: '' } },
    ]);
  });

  it('explains what is wrong with a file it cannot use', () => {
    expect(parseSportImport('sports.txt', 'name\nPadel').error).toBe('Choose a .csv or .json file.');
    expect(parseSportImport('sports.json', '{"name":').error).toBe("This file isn't valid JSON.");
    expect(parseSportImport('sports.json', '{"name":"Padel"}').error).toContain('must hold a list');
    expect(parseSportImport('sports.csv', 'title\nPadel').error).toContain('"name" column');
    expect(parseSportImport('sports.csv', 'name\n\n').error).toBe('The file has no sports to import.');
    expect(parseSportImport('sports.json', '[]').error).toBe('The file has no sports to import.');
  });
});
