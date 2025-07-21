import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

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
  private apiUrl = `${environment.apiUrl}/v1/auth`;

  /**
   * Get current user profile
   */
  getProfile(): Observable<UserProfile> {
    return this.http.get<{ user: UserProfile }>(`${this.apiUrl}/profile`).pipe(
      map(response => response.user)
    );
  }

  /**
   * Update user profile
   */
  updateProfile(data: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.put<{ 
      message: string; 
      user: UserProfile 
    }>(`${this.apiUrl}/profile`, data).pipe(
      map(response => response.user)
    );
  }

  /**
   * Change user password
   */
  changePassword(data: ChangePasswordRequest): Observable<boolean> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/change-password`, data).pipe(
      map(() => true)
    );
  }

  /**
   * Verify user email
   */
  verifyEmail(): Observable<boolean> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/verify-email`, {}).pipe(
      map(() => true)
    );
  }
}