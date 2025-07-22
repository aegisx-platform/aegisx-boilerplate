import { Component, inject, OnInit } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, map, Observable } from 'rxjs';
import { MainLayoutComponent } from './layout/components/main-layout.component';
import { AuthService } from './core/services/auth.service';

@Component({
  imports: [CommonModule, RouterModule, MainLayoutComponent],
  selector: 'app-root',
  template: `
    <div class="app-container">
      <app-main-layout *ngIf="showLayout$ | async; else publicContent"></app-main-layout>
      <ng-template #publicContent>
        <router-outlet></router-outlet>
      </ng-template>
    </div>
  `,
})
export class App implements OnInit {
  protected title = 'AegisX Admin';
  showLayout$: Observable<boolean>;

  private router = inject(Router);
  private authService = inject(AuthService);

  constructor() {
    this.showLayout$ = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map((event: NavigationEnd) => {
        // Show layout for all routes except login
        return !event.url.includes('/login');
      })
    );
  }

  ngOnInit(): void {
    // Initialize auth state check
    this.authService.getAuthState().subscribe();
  }
}
