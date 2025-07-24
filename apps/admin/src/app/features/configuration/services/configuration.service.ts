import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';

// Configuration Types
export interface ConfigurationMetadata {
  id?: number;
  category: string;
  config_key: string;
  display_name: string;
  description?: string;
  input_type: 'text' | 'password' | 'number' | 'select' | 'checkbox' | 'textarea';
  validation_rules?: string | object;
  is_required: boolean;
  sort_order?: number;
  group_name?: string;
  help_text?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SystemConfiguration {
  id?: number;
  category: string;
  configKey: string;
  configValue: string;
  valueType: 'string' | 'number' | 'boolean' | 'password' | 'json';
  environment: 'development' | 'production' | 'staging' | 'test';
  isActive: boolean;
  description?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConfigurationTemplate {
  id?: number;
  category: string;
  template_name: string;
  display_name: string;
  description?: string;
  template_config: object;
  is_active: boolean;
  sort_order?: number;
  created_at?: string;
}

export interface ConfigurationHistory {
  id?: number;
  config_id: number;
  old_value?: string;
  new_value?: string;
  change_reason?: string;
  changed_by?: string;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

export interface ConfigurationSearchParams {
  category?: string;
  environment?: string;
  config_key?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeInactive?: boolean;
}

export interface ConfigurationSearchResult {
  configurations: SystemConfiguration[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ConfigurationValues {
  category: string;
  environment: string;
  values: Record<string, any>;
  lastUpdated: string;
}

export interface HotReloadStats {
  services: Record<string, {
    successCount: number;
    errorCount: number;
    categories: string[];
    environments: string[];
    priority: number;
    lastError?: string;
    lastReloadDuration?: number;
  }>;
  source: string;
  timestamp: string;
}

export interface ReloadRequest {
  category: string;
  environment: string;
  changeReason?: string;
}

export interface BulkUpdateRequest {
  updates: Array<{
    id?: number;
    category: string;
    configKey: string;
    configValue: string;
    environment: string;
    valueType?: string;
    description?: string;
  }>;
}

export interface TemplateApplyRequest {
  templateName: string;
  category: string;
  environment: string;
  variables: Record<string, string>;
  overwriteExisting?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private baseUrl = '/api/v1/config';

  // Real-time configuration updates
  private configurationUpdatedSubject = new BehaviorSubject<{
    category: string;
    environment: string;
    timestamp: Date;
  } | null>(null);
  public configurationUpdated$ = this.configurationUpdatedSubject.asObservable();

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private handleError(error: any) {
    console.error('Configuration API Error:', error);
    return throwError(() => error);
  }

  /**
   * Search configurations with filters and pagination
   */
  searchConfigurations(params: ConfigurationSearchParams): Observable<ConfigurationSearchResult> {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return this.http.get<{
      success: boolean;
      data: {
        configurations: SystemConfiguration[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };
    }>(`${this.baseUrl}/search`, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      map(response => ({
        configurations: response.data.configurations,
        total: response.data.pagination.total,
        pagination: response.data.pagination
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Get configuration by ID
   */
  getConfigurationById(id: number): Observable<SystemConfiguration> {
    return this.http.get<{
      success: boolean;
      data: SystemConfiguration;
    }>(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Get configurations by category with metadata
   */
  getConfigurationByCategory(
    category: string,
    environment: string = 'development',
    includeInactive: boolean = false
  ): Observable<{
    configurations: SystemConfiguration[];
    metadata: ConfigurationMetadata[];
  }> {
    let params = new HttpParams()
      .set('environment', environment)
      .set('includeInactive', includeInactive.toString());

    return this.http.get<{
      success: boolean;
      data: {
        configurations: SystemConfiguration[];
        metadata: ConfigurationMetadata[];
      };
    }>(`${this.baseUrl}/category/${category}`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Get configuration values as key-value pairs
   */
  getConfigurationValues(category: string, environment: string = 'development'): Observable<ConfigurationValues> {
    let params = new HttpParams().set('environment', environment);

    return this.http.get<{
      success: boolean;
      data: ConfigurationValues;
    }>(`${this.baseUrl}/values/${category}`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Get merged configuration from multiple sources
   */
  getMergedConfiguration(category: string, environment: string = 'development'): Observable<Record<string, any>> {
    let params = new HttpParams().set('environment', environment);

    return this.http.get<{
      success: boolean;
      data: Record<string, any>;
    }>(`${this.baseUrl}/merged/${category}`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Create new configuration
   */
  createConfiguration(config: Omit<SystemConfiguration, 'id' | 'created_at' | 'updated_at'>): Observable<SystemConfiguration> {
    return this.http.post<{
      success: boolean;
      data: SystemConfiguration;
    }>(`${this.baseUrl}`, config, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        this.notifyConfigurationUpdate(config.category, config.environment);
        return response.data;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Update configuration
   */
  updateConfiguration(id: number, config: Partial<SystemConfiguration>): Observable<SystemConfiguration> {
    return this.http.put<{
      success: boolean;
      data: SystemConfiguration;
    }>(`${this.baseUrl}/${id}`, config, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        if (config.category && config.environment) {
          this.notifyConfigurationUpdate(config.category, config.environment);
        }
        return response.data;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Bulk update configurations
   */
  bulkUpdateConfigurations(request: BulkUpdateRequest): Observable<SystemConfiguration[]> {
    return this.http.put<{
      success: boolean;
      data: SystemConfiguration[];
    }>(`${this.baseUrl}/bulk`, request, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        // Notify for all affected categories/environments
        const affected = new Set<string>();
        request.updates.forEach(update => {
          affected.add(`${update.category}:${update.environment}`);
        });
        
        affected.forEach(combo => {
          const [category, environment] = combo.split(':');
          this.notifyConfigurationUpdate(category, environment);
        });
        
        return response.data;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Delete configuration
   */
  deleteConfiguration(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{
      success: boolean;
      message: string;
    }>(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get configuration history
   */
  getConfigurationHistory(
    configId: number,
    options: {
      page?: number;
      limit?: number;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Observable<{
    history: ConfigurationHistory[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    let params = new HttpParams();
    if (options.page) params = params.set('page', options.page.toString());
    if (options.limit) params = params.set('limit', options.limit.toString());
    if (options.sortOrder) params = params.set('sortOrder', options.sortOrder);

    return this.http.get<{
      success: boolean;
      data: {
        history: ConfigurationHistory[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };
    }>(`${this.baseUrl}/${configId}/history`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Get available categories
   */
  getCategories(environment?: string): Observable<string[]> {
    let params = new HttpParams();
    if (environment) params = params.set('environment', environment);

    return this.http.get<{
      success: boolean;
      data: string[];
    }>(`${this.baseUrl}/categories`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Get available environments
   */
  getEnvironments(): Observable<string[]> {
    return this.http.get<{
      success: boolean;
      data: string[];
    }>(`${this.baseUrl}/environments`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Get configuration templates
   */
  getTemplates(category?: string): Observable<ConfigurationTemplate[]> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);

    return this.http.get<{
      success: boolean;
      data: ConfigurationTemplate[];
    }>(`${this.baseUrl}/templates`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Get template by provider name
   */
  getTemplateByProvider(providerName: string, category: string): Observable<ConfigurationTemplate> {
    return this.http.get<{
      success: boolean;
      data: ConfigurationTemplate;
    }>(`${this.baseUrl}/templates/${providerName}`, {
      headers: this.getHeaders(),
      params: new HttpParams().set('category', category)
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Apply template to create configurations
   */
  applyTemplate(request: TemplateApplyRequest): Observable<{
    created: SystemConfiguration[];
    updated: SystemConfiguration[];
    skipped: string[];
  }> {
    return this.http.post<{
      success: boolean;
      data: {
        created: SystemConfiguration[];
        updated: SystemConfiguration[];
        skipped: string[];
      };
    }>(`${this.baseUrl}/templates/apply`, request, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        this.notifyConfigurationUpdate(request.category, request.environment);
        return response.data;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Force reload configuration
   */
  forceReload(request: ReloadRequest): Observable<{
    category: string;
    environment: string;
    requestedBy: number;
    requestedAt: string;
    reason?: string;
    status: string;
    method: string;
  }> {
    return this.http.post<{
      success: boolean;
      data: {
        category: string;
        environment: string;
        requestedBy: number;
        requestedAt: string;
        reason?: string;
        status: string;
        method: string;
      };
    }>(`${this.baseUrl}/reload`, request, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        this.notifyConfigurationUpdate(request.category, request.environment);
        return response.data;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get hot reload statistics
   */
  getReloadStats(): Observable<HotReloadStats> {
    return this.http.get<{
      success: boolean;
      data: HotReloadStats;
    }>(`${this.baseUrl}/reload/stats`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Reset reload statistics
   */
  resetReloadStats(): Observable<{
    resetMethod: string;
    resetAt: string;
  }> {
    return this.http.post<{
      success: boolean;
      data: {
        resetMethod: string;
        resetAt: string;
      };
    }>(`${this.baseUrl}/reload/stats/reset`, {}, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Get configuration metadata for UI form generation
   */
  getConfigurationMetadata(category: string): Observable<ConfigurationMetadata[]> {
    return this.http.get<{
      success: boolean;
      data: ConfigurationMetadata[];
    }>(`${this.baseUrl}/metadata/${category}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Utility method to notify configuration updates
   */
  private notifyConfigurationUpdate(category: string, environment: string): void {
    this.configurationUpdatedSubject.next({
      category,
      environment,
      timestamp: new Date()
    });
  }

  /**
   * Get environment color for UI
   */
  getEnvironmentColor(environment: string): string {
    const colors = {
      'development': 'text-blue-600 bg-blue-50',
      'production': 'text-red-600 bg-red-50',
      'staging': 'text-yellow-600 bg-yellow-50',
      'test': 'text-green-600 bg-green-50'
    };
    return colors[environment as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  }

  /**
   * Get value type color for UI
   */
  getValueTypeColor(valueType: string): string {
    const colors = {
      'string': 'text-blue-600',
      'number': 'text-green-600',
      'boolean': 'text-purple-600',
      'json': 'text-orange-600'
    };
    return colors[valueType as keyof typeof colors] || 'text-gray-600';
  }

  /**
   * Format configuration value for display
   */
  formatConfigValue(value: string, valueType: string): string {
    if (!value) return '-';
    
    switch (valueType) {
      case 'boolean':
        return value === 'true' ? 'Yes' : 'No';
      case 'json':
        try {
          return JSON.stringify(JSON.parse(value), null, 2);
        } catch {
          return value;
        }
      case 'password':
        return '●●●●●●●●';
      default:
        return value;
    }
  }

  /**
   * Validate configuration value based on metadata
   */
  validateConfigValue(value: any, metadata: ConfigurationMetadata): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Required check
    if (metadata.is_required && (!value || value.toString().trim() === '')) {
      errors.push(`${metadata.display_name} is required`);
    }
    
    // Type-specific validation
    if (value && value.toString().trim() !== '') {
      const validationRules = typeof metadata.validation_rules === 'string' 
        ? JSON.parse(metadata.validation_rules) 
        : metadata.validation_rules;
        
      if (validationRules) {
        // Pattern validation
        if (validationRules.pattern) {
          const regex = new RegExp(validationRules.pattern);
          if (!regex.test(value.toString())) {
            errors.push(`${metadata.display_name} format is invalid`);
          }
        }
        
        // Min/Max length
        if (validationRules.minLength && value.toString().length < validationRules.minLength) {
          errors.push(`${metadata.display_name} must be at least ${validationRules.minLength} characters`);
        }
        if (validationRules.maxLength && value.toString().length > validationRules.maxLength) {
          errors.push(`${metadata.display_name} must be no more than ${validationRules.maxLength} characters`);
        }
        
        // Number validation
        if (metadata.input_type === 'number') {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            errors.push(`${metadata.display_name} must be a valid number`);
          } else {
            if (validationRules.min !== undefined && numValue < validationRules.min) {
              errors.push(`${metadata.display_name} must be at least ${validationRules.min}`);
            }
            if (validationRules.max !== undefined && numValue > validationRules.max) {
              errors.push(`${metadata.display_name} must be no more than ${validationRules.max}`);
            }
          }
        }
        
        // Select options validation
        if (validationRules.options && Array.isArray(validationRules.options)) {
          if (!validationRules.options.includes(value.toString())) {
            errors.push(`${metadata.display_name} must be one of: ${validationRules.options.join(', ')}`);
          }
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}