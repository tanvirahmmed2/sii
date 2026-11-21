import { QueryResultRow } from 'pg';

export interface DatabaseQueryResult<T extends QueryResultRow = QueryResultRow> {
  rows: T[];
  rowCount: number | null;
  command: string;
  oid: number;
  fields: Array<{
    name: string;
    tableID: number;
    columnID: number;
    dataTypeID: number;
    dataTypeSize: number;
    dataTypeModifier: number;
    format: string;
  }>;
}

export type QueryParamValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Date
  | Buffer
  | Record<string, unknown>
  | unknown[];
