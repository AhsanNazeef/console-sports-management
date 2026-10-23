import { SportInput } from './sport.model';

// One sport from an import file. Rows are numbered from 1: after the CSV header, or by position in the JSON list.
export interface SportImportRow {
  row: number;
  sport: SportInput;
}

export interface SportImportFailure {
  row: number;
  name: string;
  message: string;
}

// Running totals while the rows are sent: 201 counts as added, 409 (name taken) as skipped, anything else as failed.
export interface SportImportProgress {
  total: number;
  done: number;
  added: number;
  skipped: number;
  failures: SportImportFailure[];
}

export type ParsedSportImport = { rows: SportImportRow[]; error: null } | { rows: null; error: string };
