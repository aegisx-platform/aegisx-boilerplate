import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    
    const isAuthenticated = this.authService.isUserAuthenticated();
    
    if (isAuthenticated) {
      // Check if token is expired
      if (this.authService.isTokenExpired()) {
        // Try to refresh token
        return this.handleTokenRefresh(state.url);
      }
      return true;
    }
    
    // Not authenticated, redirect to login
    this.router.navigate(['/login'], { 
      queryParams: { returnUrl: state.url } 
    });
    return false;
  }

  /**
   * Handle token refresh
   */
  private async handleTokenRefresh(returnUrl: string): Promise<boolean> {
    try {
      const newToken = await this.authService.refreshAccessToken();
      
      if (newToken) {
        return true;
      } else {
        // Refresh failed, redirect to login
        this.router.navigate(['/login'], { 
          queryParams: { returnUrl } 
        });
        return false;
      }
    } catch (error) {
      // Refresh failed, redirect to login
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl } 
      });
      return false;
    }
  }
}