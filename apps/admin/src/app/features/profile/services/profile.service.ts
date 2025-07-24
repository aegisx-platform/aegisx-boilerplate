import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  name: string;
  roles: string[];
  permissions: string[];
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileRequest {
  name?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/v1/auth`;

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private handleError(error: any) {
    console.error('Profile API Error:', error);
    return throwError(() => error);
  }

  /**
   * Get current user profile
   */
  getProfile(): Observable<UserProfile> {
    return this.http.get<{ user: UserProfile }>(`${this.apiUrl}/profile`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.user),
      catchError(this.handleError)
    );
  }

  /**
   * Update user profile
   */
  updateProfile(data: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.put<{ 
      message: string; 
      user: UserProfile 
    }>(`${this.apiUrl}/profile`, data, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.user),
      catchError(this.handleError)
    );
  }

  /**
   * Change user password
   */
  changePassword(data: ChangePasswordRequest): Observable<boolean> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/change-password`, data, {
      headers: this.getHeaders()
    }).pipe(
      map(() => true),
      catchError(this.handleError)
    );
  }

  /**
   * Verify user email
   */
  verifyEmail(): Observable<boolean> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/verify-email`, {}, {
      headers: this.getHeaders()
    }).pipe(
      map(() => true),
      catchError(this.handleError)
    );
  }
}