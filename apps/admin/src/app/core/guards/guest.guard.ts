import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class GuestGuard implements CanActivate {
  
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
      // User is already authenticated, redirect to dashboard
      this.router.navigate(['/dashboard']);
      return false;
    }
    
    // User is not authenticated, allow access to guest pages
    return true;
  }
}