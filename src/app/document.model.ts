export type IngestionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export interface DocumentItem {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;

  ingestionStatus?: IngestionStatus;
  ingestionError?: string | null;
}