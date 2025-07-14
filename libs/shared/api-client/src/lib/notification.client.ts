import {
  Notification,
  CreateNotificationRequest,
  NotificationResponse,
  NotificationListResponse,
  BatchCreateRequest,
  BatchStatus,
  BatchMetrics,
  ApiResponse,
  ApiError
} from '@aegisx-boilerplate/types';

export interface NotificationClientConfig {
  baseUrl?: string;
  timeout?: number;
}

export class NotificationClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: NotificationClientConfig = {}) {
    this.baseUrl = config.baseUrl || '/api/v1';
    this.timeout = config.timeout || 10000;
  }

  // Core Notification Operations
  async createNotification(request: CreateNotificationRequest): Promise<NotificationResponse> {
    return this.request<NotificationResponse>('POST', '/notifications', request);
  }

  async getNotifications(params?: {
    limit?: number;
    offset?: number;
    status?: string;
    priority?: string;
    channel?: string;
  }): Promise<NotificationListResponse> {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<NotificationListResponse>('GET', `/notifications${queryString}`);
  }

  async getNotificationById(id: string): Promise<NotificationResponse> {
    return this.request<NotificationResponse>('GET', `/notifications/${id}`);
  }

  async updateNotification(id: string, data: Partial<Notification>): Promise<NotificationResponse> {
    return this.request<NotificationResponse>('PUT', `/notifications/${id}`, data);
  }

  async deleteNotification(id: string): Promise<ApiResponse> {
    return this.request<ApiResponse>('DELETE', `/notifications/${id}`);
  }

  // Batch Operations
  async createBulkBatch(request: BatchCreateRequest): Promise<ApiResponse<{ batchId: string; notificationCount: number; estimatedProcessingTime: number }>> {
    return this.request('POST', '/notifications/batch/bulk', request);
  }

  async getBatchStatus(batchId: string): Promise<ApiResponse<BatchStatus>> {
    return this.request('GET', `/notifications/batch/${batchId}`);
  }

  async getBatchMetrics(): Promise<ApiResponse<BatchMetrics>> {
    return this.request('GET', '/notifications/batch/metrics');
  }

  async retryBatch(batchId: string): Promise<ApiResponse<{ batchId: string; newBatchId: string }>> {
    return this.request('POST', `/notifications/batch/${batchId}/retry`);
  }

  async cancelBatch(batchId: string): Promise<ApiResponse<{ batchId: string; cancelled: boolean }>> {
    return this.request('DELETE', `/notifications/batch/${batchId}`);
  }

  async getBatchHealth(): Promise<ApiResponse<any>> {
    return this.request('GET', '/notifications/batch/health');
  }

  // Private helper method for making HTTP requests
  private async request<T>(method: string, endpoint: string, data?: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(this.timeout),
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorData: ApiError;
        try {
          errorData = await response.json();
        } catch {
          errorData = {
            success: false,
            error: `HTTP ${response.status}`,
            message: response.statusText || 'An error occurred'
          };
        }
        throw new NotificationClientError(errorData.message, response.status, errorData);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof NotificationClientError) {
        throw error;
      }
      
      // Handle network errors, timeouts, etc.
      throw new NotificationClientError(
        error instanceof Error ? error.message : 'Network error occurred',
        0,
        {
          success: false,
          error: 'NetworkError',
          message: error instanceof Error ? error.message : 'Network error occurred'
        }
      );
    }
  }
}

export class NotificationClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public response: ApiError
  ) {
    super(message);
    this.name = 'NotificationClientError';
  }
}

// Singleton instance for easy usage
export const notificationClient = new NotificationClient();