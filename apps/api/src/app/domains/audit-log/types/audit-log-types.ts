import { Static } from '@sinclair/typebox';
import { 
  AuditLogSchema,
  CreateAuditLogSchema,
  AuditLogQuerySchema
} from '../schemas/audit-log-schemas';

export type AuditLog = Static<typeof AuditLogSchema>;
export type CreateAuditLogRequest = Static<typeof CreateAuditLogSchema>;
export type AuditLogQuery = Static<typeof AuditLogQuerySchema>;

export type AuditAction = 
  | 'CREATE' 
  | 'READ' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'EXPORT' 
  | 'IMPORT'
  | 'ACCESS_DENIED'
  | 'PASSWORD_CHANGE'
  | 'EMAIL_VERIFY'
  | 'ROLE_ASSIGN'
  | 'PERMISSION_GRANT';

export type AuditStatus = 'success' | 'failed' | 'error';

export interface AuditLogEntity {
  id: string;
  user_id: string | null;
  action: AuditAction;
  resource_type: string;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  metadata: Record<string, any> | null;
  status: AuditStatus;
  error_message: string | null;
  created_at: Date;
}

export interface CreateAuditLogData {
  user_id?: string | null;
  action: AuditAction;
  resource_type: string;
  resource_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  session_id?: string | null;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  status?: AuditStatus;
  error_message?: string | null;
}

export interface AuditLogRepository {
  create(data: CreateAuditLogData): Promise<AuditLogEntity>;
  findById(id: string): Promise<AuditLogEntity | null>;
  findByUserId(userId: string, limit?: number, offset?: number): Promise<AuditLogEntity[]>;
  findByResourceType(resourceType: string, limit?: number, offset?: number): Promise<AuditLogEntity[]>;
  findByAction(action: AuditAction, limit?: number, offset?: number): Promise<AuditLogEntity[]>;
  findByDateRange(startDate: Date, endDate: Date, limit?: number, offset?: number): Promise<AuditLogEntity[]>;
  search(query: AuditLogSearchParams): Promise<{
    data: AuditLogEntity[];
    total: number;
    page: number;
    limit: number;
  }>;
  getStats(): Promise<AuditLogStats>;
  cleanup(olderThanDays: number): Promise<number>;
}

export interface AuditLogSearchParams {
  user_id?: string;
  action?: AuditAction;
  resource_type?: string;
  resource_id?: string;
  status?: AuditStatus;
  start_date?: Date;
  end_date?: Date;
  ip_address?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'created_at' | 'action' | 'resource_type';
  sort_order?: 'asc' | 'desc';
}

export interface AuditLogStats {
  total_logs: number;
  success_count: number;
  failed_count: number;
  error_count: number;
  actions_summary: Record<AuditAction, number>;
  resource_types_summary: Record<string, number>;
  last_24h_count: number;
  last_7d_count: number;
  last_30d_count: number;
}

export interface AuditContext {
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  request_id?: string;
}

export interface AuditableChange {
  field: string;
  old_value: any;
  new_value: any;
}

export class AuditLogError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode = 500
  ) {
    super(message);
    this.name = 'AuditLogError';
  }
}

export function isValidAuditAction(action: string): action is AuditAction {
  return [
    'CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 
    'EXPORT', 'IMPORT', 'ACCESS_DENIED', 'PASSWORD_CHANGE', 
    'EMAIL_VERIFY', 'ROLE_ASSIGN', 'PERMISSION_GRANT'
  ].includes(action as AuditAction);
}

export function isValidAuditStatus(status: string): status is AuditStatus {
  return ['success', 'failed', 'error'].includes(status);
}