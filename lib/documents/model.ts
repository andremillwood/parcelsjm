export type DocumentRequest = {
  id: string;
  profile_id: string;
  package_id: string | null;
  document_type: string;
  instructions: string;
  status: string;
  version: number;
  created_at: string;
};
export type DocumentUpload = {
  id: string;
  request_id: string;
  version: number;
  filename: string;
  declared_size: number;
  scan_state: string;
  amount: number | null;
  currency: string | null;
  merchant: string;
  order_reference: string;
  created_at: string;
};
export type DocumentHistory = {
  id: string;
  request_id: string;
  upload_id: string | null;
  action: string;
  reason: string;
  created_at: string;
};
export type DocumentData = {
  requests: DocumentRequest[];
  uploads: DocumentUpload[];
  history: DocumentHistory[];
  canRequest: boolean;
  canReview: boolean;
  uploadsEnabled: boolean;
};
