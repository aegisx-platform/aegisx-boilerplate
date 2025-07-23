import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Notification,
  NotificationTemplate,
  UserPreferences,
  NotificationBatch,
  NotificationStats,
  QueueStatus,
  CreateNotificationRequest,
  ListNotificationsParams,
  NotificationListResponse,
  CreateTemplateRequest,
  CreateBatchRequest,
  NotificationStatus
} from '../types/notification.types';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/v1/notifications`;

  // Core notification operations
  createNotification(request: CreateNotificationRequest): Observable<{ success: boolean; data: Notification }> {
    return this.http.post<{ success: boolean; data: Notification }>(this.apiUrl, request);
  }

  getNotification(id: string): Observable<{ success: boolean; data: Notification }> {
    return this.http.get<{ success: boolean; data: Notification }>(`${this.apiUrl}/${id}`);
  }

  listNotifications(params?: ListNotificationsParams): Observable<NotificationListResponse> {
    let httpParams = new HttpParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(item => {
              httpParams = httpParams.append(key, item);
            });
          } else {
            httpParams = httpParams.set(key, value.toString());
          }
        }
      });
    }

    return this.http.get<NotificationListResponse>(this.apiUrl, { params: httpParams });
  }

  updateNotificationStatus(id: string, status: NotificationStatus): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, { status });
  }

  cancelNotification(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/cancel`, {});
  }

  deleteNotification(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }


  // Template management
  createTemplate(request: CreateTemplateRequest): Observable<{ success: boolean; data: NotificationTemplate }> {
    return this.http.post<{ success: boolean; data: NotificationTemplate }>(`${this.apiUrl}/templates`, request);
  }

  getTemplate(id: string): Observable<{ success: boolean; data: NotificationTemplate }> {
    return this.http.get<{ success: boolean; data: NotificationTemplate }>(`${this.apiUrl}/templates/${id}`);
  }

  listTemplates(): Observable<{ success: boolean; data: { templates: NotificationTemplate[]; count: number } }> {
    return this.http.get<{ success: boolean; data: { templates: NotificationTemplate[]; count: number } }>(`${this.apiUrl}/templates`);
  }

  updateTemplate(id: string, request: Partial<CreateTemplateRequest>): Observable<{ success: boolean; data: NotificationTemplate }> {
    return this.http.patch<{ success: boolean; data: NotificationTemplate }>(`${this.apiUrl}/templates/${id}`, request);
  }

  deleteTemplate(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/templates/${id}`);
  }

  // User preferences
  getUserPreferences(userId: string): Observable<{ success: boolean; data: UserPreferences }> {
    return this.http.get<{ success: boolean; data: UserPreferences }>(`${this.apiUrl}/preferences/${userId}`);
  }

  setUserPreferences(userId: string, preferences: Partial<UserPreferences>): Observable<{ success: boolean; data: UserPreferences }> {
    return this.http.post<{ success: boolean; data: UserPreferences }>(`${this.apiUrl}/preferences/${userId}`, preferences);
  }

  updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Observable<{ success: boolean; data: UserPreferences }> {
    return this.http.patch<{ success: boolean; data: UserPreferences }>(`${this.apiUrl}/preferences/${userId}`, preferences);
  }

  // Batch operations
  createBatch(request: CreateBatchRequest): Observable<{ success: boolean; data: { batchId: string } }> {
    return this.http.post<{ success: boolean; data: { batchId: string } }>(`${this.apiUrl}/batch/bulk-create`, request);
  }

  getBatchStatus(batchId: string): Observable<{ success: boolean; data: NotificationBatch }> {
    return this.http.get<{ success: boolean; data: NotificationBatch }>(`${this.apiUrl}/batch/${batchId}/status`);
  }

  listBatches(): Observable<{ success: boolean; data: NotificationBatch[] }> {
    return this.http.get<{ success: boolean; data: NotificationBatch[] }>(`${this.apiUrl}/batch`);
  }

  getBatchMetrics(): Observable<{ success: boolean; data: any }> {
    return this.http.get<{ success: boolean; data: any }>(`${this.apiUrl}/batch/metrics`);
  }

  pauseBatchProcessing(): Observable<any> {
    return this.http.post(`${this.apiUrl}/batch/pause`, {});
  }

  resumeBatchProcessing(): Observable<any> {
    return this.http.post(`${this.apiUrl}/batch/resume`, {});
  }

  retryBatch(batchId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/batch/${batchId}/retry`, {});
  }

  cancelBatch(batchId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/batch/${batchId}`);
  }

  // Analytics
  getNotificationStats(): Observable<{ success: boolean; data: NotificationStats }> {
    return this.http.get<{ success: boolean; data: NotificationStats }>(`${this.apiUrl}/analytics/stats`);
  }

  getDeliveryMetrics(): Observable<{ success: boolean; data: any }> {
    return this.http.get<{ success: boolean; data: any }>(`${this.apiUrl}/analytics/delivery-metrics`);
  }

  getChannelStats(): Observable<{ success: boolean; data: any }> {
    return this.http.get<{ success: boolean; data: any }>(`${this.apiUrl}/analytics/channel-stats`);
  }

  // Error tracking
  getNotificationErrors(id: string): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(`${this.apiUrl}/${id}/errors`);
  }

  // Error management
  getErrorLogs(params: any): Observable<{ success: boolean; data: any }> {
    return this.http.get<{ success: boolean; data: any }>(`${this.apiUrl}/errors`, { params });
  }

  getErrorStatistics(params: any): Observable<{ success: boolean; data: any }> {
    return this.http.get<{ success: boolean; data: any }>(`${this.apiUrl}/errors/statistics`, { params });
  }

  exportErrors(params: any): Observable<string> {
    return this.http.get(`${this.apiUrl}/errors/export`, { 
      params, 
      responseType: 'text' 
    });
  }

  // Healthcare specific
  createHealthcareNotification(request: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/healthcare`, request);
  }

  sendAppointmentReminder(request: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/healthcare/appointment-reminder`, request);
  }

  sendLabResults(request: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/healthcare/lab-results`, request);
  }

  sendEmergencyNotification(request: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/healthcare/emergency`, request);
  }

  // Queue operations
  getQueuedNotifications(priority?: string, limit: number = 50): Observable<{ success: boolean; data: { notifications: Notification[]; count: number } }> {
    const params = new URLSearchParams();
    if (priority) params.set('priority', priority);
    params.set('limit', limit.toString());
    
    const queryString = params.toString();
    const url = `${this.apiUrl}/queue/pending${queryString ? '?' + queryString : ''}`;
    
    return this.http.get<{ success: boolean; data: { notifications: Notification[]; count: number } }>(url);
  }

  getScheduledNotifications(beforeDate?: string): Observable<{ success: boolean; data: { notifications: Notification[]; count: number } }> {
    const params = new URLSearchParams();
    if (beforeDate) params.set('beforeDate', beforeDate);
    
    const queryString = params.toString();
    const url = `${this.apiUrl}/queue/scheduled${queryString ? '?' + queryString : ''}`;
    
    return this.http.get<{ success: boolean; data: { notifications: Notification[]; count: number } }>(url);
  }

  processQueuedNotifications(priority?: string, limit: number = 10): Observable<{ success: boolean; data: { processed: number; successful: number; failed: number } }> {
    const body: any = { limit };
    if (priority) body.priority = priority;
    
    return this.http.post<{ success: boolean; data: { processed: number; successful: number; failed: number } }>(`${this.apiUrl}/queue/process`, body);
  }

  // Utility methods
  getNotificationStatusColor(status: NotificationStatus): string {
    const colors = {
      'queued': 'info',
      'processing': 'warning',
      'sent': 'primary',
      'delivered': 'success',
      'failed': 'danger',
      'cancelled': 'secondary'
    };
    return colors[status] || 'secondary';
  }

  getChannelIcon(channel: string): string {
    const icons: Record<string, string> = {
      'email': 'pi pi-envelope',
      'sms': 'pi pi-mobile',
      'push': 'pi pi-bell',
      'webhook': 'pi pi-link',
      'slack': 'pi pi-slack',
      'in-app': 'pi pi-desktop'
    };
    return icons[channel] || 'pi pi-info-circle';
  }

  getPriorityIcon(priority: string): string {
    const icons: Record<string, string> = {
      'low': 'pi pi-angle-down',
      'normal': 'pi pi-minus',
      'high': 'pi pi-angle-up',
      'urgent': 'pi pi-angle-double-up',
      'critical': 'pi pi-exclamation-triangle'
    };
    return icons[priority] || 'pi pi-minus';
  }

  getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      'low': 'secondary',
      'normal': 'info',
      'high': 'primary',
      'urgent': 'warning',
      'critical': 'danger'
    };
    return colors[priority] || 'info';
  }
}
