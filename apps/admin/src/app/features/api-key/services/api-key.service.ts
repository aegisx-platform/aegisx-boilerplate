import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface ApiKeyPermissions {
  resources?: string[];
  actions?: string[];
  scopes?: string[];
  endpoints?: string[];
  rateLimit?: number;
  maxRequests?: number;
}

export interface CreateApiKeyRequest {
  name: string;
  description?: string;
  permissions?: ApiKeyPermissions;
  expiresAt?: string;
  rateLimit?: number;
  ipWhitelist?: string[];
}

export interface ApiKeyResponse {
  id: string;
  key: string;
  name: string;
  prefix: string;
  createdAt: string;
}

export interface ApiKeyListItem {
  id: string;
  name: string;
  description?: string;
  prefix: string;
  permissions: ApiKeyPermissions;
  expiresAt?: string;
  lastUsedAt?: string;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface ApiKeyDetails extends ApiKeyListItem {
  lastUsedIp?: string;
  revokedAt?: string;
  revokedBy?: string;
  revokedReason?: string;
}

export interface ApiKeyUsageStats {
  apiKeyId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastUsedAt?: string;
  lastUsedIp?: string;
  topEndpoints: Array<{
    endpoint: string;
    count: number;
  }>;
  dailyUsage: Array<{
    date: string;
    count: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class ApiKeyService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/v1/auth/api-keys`;

  /**
   * Create a new API key
   */
  createApiKey(request: CreateApiKeyRequest): Observable<ApiKeyResponse> {
    return this.http.post<{
      success: boolean;
      data: ApiKeyResponse;
      message: string;
    }>(`${this.apiUrl}`, request).pipe(
      map(response => response.data)
    );
  }

  /**
   * Get list of all API keys for current user
   */
  listApiKeys(): Observable<ApiKeyListItem[]> {
    return this.http.get<{
      success: boolean;
      data: ApiKeyListItem[];
      total: number;
    }>(`${this.apiUrl}`).pipe(
      map(response => response.data)
    );
  }

  /**
   * Get detailed information about a specific API key
   */
  getApiKey(id: string): Observable<ApiKeyDetails> {
    return this.http.get<{
      success: boolean;
      data: ApiKeyDetails;
    }>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  /**
   * Get API key usage statistics
   */
  getApiKeyUsage(id: string): Observable<ApiKeyUsageStats> {
    return this.http.get<{
      success: boolean;
      data: ApiKeyDetails & {
        usageStats: ApiKeyUsageStats;
      };
    }>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data.usageStats)
    );
  }

  /**
   * Revoke an API key
   */
  revokeApiKey(id: string, reason?: string): Observable<boolean> {
    return this.http.delete<{
      success: boolean;
      message: string;
    }>(`${this.apiUrl}/${id}`, {
      body: reason ? { reason } : {}
    }).pipe(
      map(response => response.success)
    );
  }

  /**
   * Regenerate an existing API key
   */
  regenerateApiKey(id: string): Observable<ApiKeyResponse> {
    return this.http.post<{
      success: boolean;
      data: ApiKeyResponse;
      message: string;
    }>(`${this.apiUrl}/${id}/regenerate`, {}).pipe(
      map(response => response.data)
    );
  }

  /**
   * Test API key validation
   */
  testApiKey(apiKey: string): Observable<any> {
    return this.http.get<{
      success: boolean;
      message: string;
      data: any;
    }>(`${this.apiUrl}/test/validate`, {
      headers: {
        'X-API-Key': apiKey
      }
    });
  }
}