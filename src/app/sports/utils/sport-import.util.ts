import { ParsedSportImport, SportImportRow } from '../models/sport-import.model';
import { SportInput } from '../models/sport.model';

// Reads an import file: CSV with a header row (name, and optionally description and iconUrl), or a JSON list of
// objects with those fields. Every non-blank row becomes a request; the server decides which ones are valid.
export function parseSportImport(fileName: string, text: string): ParsedSportImport {
  const content = text.replace(/^\uFEFF/, '');
  const extension = fileName.toLowerCase().split('.').pop();
  const rows = extension === 'json' ? jsonRows(content) : extension === 'csv' ? csvRows(content) : null;
  if (rows === null) {
    return { rows: null, error: 'Choose a .csv or .json file.' };
  }
  if (typeof rows === 'string') {
    return { rows: null, error: rows };
  }
  if (rows.length === 0) {
    return { rows: null, error: 'The file has no sports to import.' };
  }
  return { rows, error: null };
}

function jsonRows(content: string): SportImportRow[] | string {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    return "This file isn't valid JSON.";
  }
  if (!Array.isArray(data)) {
    return 'The JSON file must hold a list of sports, like [{"name": "Padel"}].';
  }
  return data.map((item: unknown, index) => {
    const record = item !== null && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      row: index + 1,
      sport: toSport(text(record['name']), text(record['description']), text(record['iconUrl'])),
    };
  });
}

function csvRows(content: string): SportImportRow[] | string {
  const [header = [], ...records] = parseCsv(content);
  // "iconUrl", "Icon URL" and "icon_url" all name the same column.
  const columns = header.map((cell) => cell.toLowerCase().replace(/[^a-z]/g, ''));
  const nameColumn = columns.indexOf('name');
  if (nameColumn === -1) {
    return 'The CSV file needs a header row with a "name" column.';
  }
  const descriptionColumn = columns.indexOf('description');
  const iconUrlColumn = columns.indexOf('iconurl');
  const cell = (record: string[], column: number): string => (column === -1 ? '' : (record[column] ?? '').trim());
  return records
    .filter((record) => record.some((value) => value.trim()))
    .map((record, index) => ({
      row: index + 1,
      sport: toSport(cell(record, nameColumn), cell(record, descriptionColumn), cell(record, iconUrlColumn)),
    }));
}

// The API rejects empty optional fields, so they are left out.
function toSport(name: string, description: string, iconUrl: string): SportInput {
  return { name, ...(description ? { description } : {}), ...(iconUrl ? { iconUrl } : {}) };
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

// RFC 4180 CSV: commas, quoted fields with "" for a quote, and line breaks (LF or CRLF) inside quotes.
function parseCsv(content: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (quoted) {
      if (char === '"' && content[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      record.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && content[i + 1] === '\n') {
        i++;
      }
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records;
}
