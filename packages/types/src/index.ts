export type CampaignStatus = "draft" | "running" | "completed" | "failed" | "paused";
export type LeadPriority = "HIGH" | "MEDIUM" | "LOW";
export type CrmStatus =
  | "new"
  | "potential_customer"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "not_interested"
  | "lost"
  | "archived";
export type WorkspaceRole = "owner" | "admin" | "member";
export type IntegrationType = "openai" | "whatsapp" | "gmail" | "slack" | "telegram" | "webhook";

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
