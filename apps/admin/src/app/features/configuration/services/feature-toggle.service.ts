import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, map, catchError, tap, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

export interface FeatureToggleResponse {
  success: boolean;
  data: {
    featureToggles: Record<string, boolean>;
    environment: string;
    total: number;
  };
}

export interface FeatureToggleStatsResponse {
  success: boolean;
  data: {
    total: number;
    enabled: number;
    disabled: number;
    environment: string;
    features: { name: string; enabled: boolean; }[];
    generatedAt: string;
  };
}

export interface FeatureToggleCheckResponse {
  success: boolean;
  data: {
    featureName: string;
    environment: string;
    isEnabled: boolean;
    checkedAt: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class FeatureToggleService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private baseUrl = '/api/v1/config/feature-toggles';

  // Cache for feature flags
  private featureFlagsCache = new Map<string, Record<string, boolean>>();
  private cacheTimestamp = new Map<string, number>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  // Subject for real-time updates
  private featureFlagsSubject = new BehaviorSubject<Record<string, boolean>>({});
  public featureFlags$ = this.featureFlagsSubject.asObservable();

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private handleError(error: any) {
    console.error('Feature Toggle API Error:', error);
    return of({ success: false, data: null, error: error.message });
  }

  /**
   * Get all feature toggles for an environment
   */
  getAllFeatureToggles(environment: string = 'development', includeInactive: boolean = false): Observable<Record<string, boolean>> {
    const cacheKey = `${environment}:${includeInactive}`;
    
    // Check cache first
    if (this.isValidCache(cacheKey)) {
      const cached = this.featureFlagsCache.get(cacheKey);
      if (cached) {
        this.featureFlagsSubject.next(cached);
        return of(cached);
      }
    }

    const params = new HttpParams()
      .set('environment', environment)
      .set('includeInactive', includeInactive.toString());

    return this.http.get<FeatureToggleResponse>(this.baseUrl, {
      headers: this.getHeaders(),
      params
    }).pipe(
      map(response => {
        if (response.success) {
          const featureToggles = response.data.featureToggles;
          
          // Update cache
          this.featureFlagsCache.set(cacheKey, featureToggles);
          this.cacheTimestamp.set(cacheKey, Date.now());
          
          // Update subject
          this.featureFlagsSubject.next(featureToggles);
          
          return featureToggles;
        }
        return {};
      }),
      catchError(error => {
        console.error('Failed to get feature toggles:', error);
        return of({});
      })
    );
  }

  /**
   * Check if a specific feature is enabled
   */
  isFeatureEnabled(featureName: string, environment: string = 'development'): Observable<boolean> {
    const params = new HttpParams().set('environment', environment);

    return this.http.get<FeatureToggleCheckResponse>(`${this.baseUrl}/${featureName}`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      map(response => response.success ? response.data.isEnabled : false),
      catchError(error => {
        console.error(`Failed to check feature ${featureName}:`, error);
        return of(false); // Fail-safe: disable feature on error
      })
    );
  }

  /**
   * Enable or disable a feature toggle
   */
  setFeatureToggle(
    featureName: string, 
    enabled: boolean, 
    environment: string = 'development',
    changeReason?: string
  ): Observable<any> {
    const body = {
      enabled,
      environment,
      changeReason
    };

    return this.http.put(`${this.baseUrl}/${featureName}`, body, {
      headers: this.getHeaders()
    }).pipe(
      tap(() => {
        // Invalidate cache
        this.invalidateCache(environment);
        
        // Refresh feature flags
        this.getAllFeatureToggles(environment).subscribe();
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Bulk update multiple feature toggles
   */
  bulkUpdateFeatureToggles(
    updates: Record<string, boolean>,
    environment: string = 'development',
    changeReason?: string
  ): Observable<any> {
    const body = {
      updates,
      environment,
      changeReason
    };

    return this.http.put(`${this.baseUrl}/bulk`, body, {
      headers: this.getHeaders()
    }).pipe(
      tap(() => {
        // Invalidate cache
        this.invalidateCache(environment);
        
        // Refresh feature flags
        this.getAllFeatureToggles(environment).subscribe();
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Delete a feature toggle
   */
  deleteFeatureToggle(
    featureName: string,
    environment: string = 'development',
    changeReason?: string
  ): Observable<any> {
    const body = {
      environment,
      changeReason
    };

    return this.http.request('delete', `${this.baseUrl}/${featureName}`, {
      headers: this.getHeaders(),
      body
    }).pipe(
      tap(() => {
        // Invalidate cache
        this.invalidateCache(environment);
        
        // Refresh feature flags
        this.getAllFeatureToggles(environment).subscribe();
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get feature toggle statistics
   */
  getFeatureToggleStats(environment: string = 'development'): Observable<any> {
    const params = new HttpParams().set('environment', environment);

    return this.http.get<FeatureToggleStatsResponse>(`${this.baseUrl}/stats`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      map(response => response.success ? response.data : null),
      catchError(this.handleError)
    );
  }

  /**
   * Export feature toggles configuration
   */
  exportFeatureToggles(environment: string = 'development', includeInactive: boolean = false): Observable<any> {
    const params = new HttpParams()
      .set('environment', environment)
      .set('includeInactive', includeInactive.toString());

    return this.http.get(`${this.baseUrl}/export`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      map(response => response),
      catchError(this.handleError)
    );
  }

  /**
   * Synchronous check for feature flag (uses cached data)
   * Use this for immediate checks in components
   */
  isFeatureEnabledSync(featureName: string): boolean {
    const currentFlags = this.featureFlagsSubject.getValue();
    return currentFlags[featureName] === true;
  }

  /**
   * Get current feature flags synchronously
   */
  getCurrentFeatureFlags(): Record<string, boolean> {
    return this.featureFlagsSubject.getValue();
  }

  /**
   * Preload feature flags for an environment
   * Call this on app initialization or environment switch
   */
  preloadFeatureFlags(environment: string = 'development'): Observable<Record<string, boolean>> {
    return this.getAllFeatureToggles(environment);
  }

  /**
   * Check if cache is valid
   */
  private isValidCache(cacheKey: string): boolean {
    const timestamp = this.cacheTimestamp.get(cacheKey);
    if (!timestamp) return false;
    
    return Date.now() - timestamp < this.cacheTimeout;
  }

  /**
   * Invalidate cache for specific environment
   */
  private invalidateCache(environment: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.featureFlagsCache.keys()) {
      if (key.startsWith(environment)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.featureFlagsCache.delete(key);
      this.cacheTimestamp.delete(key);
    });
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.featureFlagsCache.clear();
    this.cacheTimestamp.clear();
  }

  /**
   * Create a feature flag directive helper
   */
  createFeatureDirective(featureName: string): () => boolean {
    return () => this.isFeatureEnabledSync(featureName);
  }

  /**
   * Utility method for conditional rendering in templates
   */
  when(featureName: string): { 
    enabled: () => boolean;
    disabled: () => boolean;
  } {
    return {
      enabled: () => this.isFeatureEnabledSync(featureName),
      disabled: () => !this.isFeatureEnabledSync(featureName)
    };
  }
}

/**
 * Feature Toggle Guard for routes
 */
@Injectable({
  providedIn: 'root'
})
export class FeatureToggleGuard {
  constructor(private featureToggleService: FeatureToggleService) {}

  canActivate(featureName: string): Observable<boolean> {
    return this.featureToggleService.isFeatureEnabled(featureName);
  }
}