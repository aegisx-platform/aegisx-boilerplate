import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { UserManagementClient } from '@aegisx-boilerplate/api-client';
import { User, LoginRequest, LoginResponse, RefreshTokenRequest } from '@aegisx-boilerplate/types';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly ACCESS_TOKEN_KEY = 'aegisx_access_token';
  private readonly REFRESH_TOKEN_KEY = 'aegisx_refresh_token';
  private readonly USER_KEY = 'aegisx_user';

  private userManagementClient: UserManagementClient;
  
  // Authentication state
  private authState = signal<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    accessToken: null,
    refreshToken: null
  });

  // Public readonly signals
  public readonly user = computed(() => this.authState().user);
  public readonly isAuthenticated = computed(() => this.authState().isAuthenticated);
  public readonly isLoading = computed(() => this.authState().isLoading);
  public readonly accessToken = computed(() => this.authState().accessToken);

  // Observable for components that need to subscribe
  private authStateSubject = new BehaviorSubject<AuthState>(this.authState());

  constructor(private router: Router) {
    this.userManagementClient = new UserManagementClient({
      baseUrl: 'http://localhost:3000/api/v1', // Direct API server call
      getAuthToken: () => this.accessToken() || this.getStoredAccessToken()
    });
    
    // Initialize auth state from storage
    this.initializeAuthState();
  }

  /**
   * Initialize authentication state from localStorage
   */
  private initializeAuthState(): void {
    const accessToken = this.getStoredAccessToken();
    const refreshToken = this.getStoredRefreshToken();
    const user = this.getStoredUser();

    if (accessToken && refreshToken && user) {
      this.updateAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
        accessToken,
        refreshToken
      });
    }
  }

  /**
   * Login user with credentials
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    this.setLoading(true);
    
    try {
      const response = await this.userManagementClient.login(credentials);
      
      // API returns direct response without success wrapper
      const { user, access_token, refresh_token } = response;
      
      // Store tokens and user data
      this.storeTokens(access_token, refresh_token);
      this.storeUser(user);
      
      // Update auth state
      this.updateAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
        accessToken: access_token,
        refreshToken: refresh_token
      });
      
      return response;
    } catch (error: any) {
      this.setLoading(false);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    this.setLoading(true);
    
    try {
      // Call logout API
      await this.userManagementClient.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', error);
    } finally {
      // Clear all stored data
      this.clearAuthData();
      
      // Update auth state
      this.updateAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        accessToken: null,
        refreshToken: null
      });
      
      // Redirect to login
      this.router.navigate(['/login']);
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getStoredRefreshToken();
    
    if (!refreshToken) {
      this.logout();
      return null;
    }

    try {
      const response = await this.userManagementClient.refreshToken({ refreshToken });
      
      if (response.success) {
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        
        // Store new tokens
        this.storeTokens(accessToken, newRefreshToken);
        
        // Update auth state
        this.updateAuthState({
          ...this.authState(),
          accessToken,
          refreshToken: newRefreshToken
        });
        
        return accessToken;
      } else {
        throw new Error(response.message || 'Token refresh failed');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isUserAuthenticated(): boolean {
    return this.isAuthenticated();
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.user();
  }

  /**
   * Get auth state as observable
   */
  getAuthState(): Observable<AuthState> {
    return this.authStateSubject.asObservable();
  }

  /**
   * Get current user profile from API
   */
  async getCurrentUserProfile(): Promise<User | null> {
    try {
      const response = await this.userManagementClient.getProfile();
      
      if (response.success) {
        const user = response.data;
        this.storeUser(user);
        this.updateAuthState({
          ...this.authState(),
          user
        });
        return user;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Update auth state and notify subscribers
   */
  private updateAuthState(newState: AuthState): void {
    this.authState.set(newState);
    this.authStateSubject.next(newState);
  }

  /**
   * Set loading state
   */
  private setLoading(loading: boolean): void {
    this.updateAuthState({
      ...this.authState(),
      isLoading: loading
    });
  }

  /**
   * Store tokens in localStorage
   */
  private storeTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  /**
   * Store user data in localStorage
   */
  private storeUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Get stored access token
   */
  private getStoredAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  /**
   * Get stored refresh token
   */
  private getStoredRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Get stored user data
   */
  private getStoredUser(): User | null {
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Clear all authentication data
   */
  private clearAuthData(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Check if access token is expired (basic check)
   */
  isTokenExpired(): boolean {
    const token = this.getStoredAccessToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= exp;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpirationTime(): number | null {
    const token = this.getStoredAccessToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000; // Convert to milliseconds
    } catch (error) {
      return null;
    }
  }

  /**
   * Get current access token
   */
  getToken(): string | null {
    return this.getStoredAccessToken();
  }
}