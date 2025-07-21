import { Component, ViewChild, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SidebarComponent } from './sidebar/sidebar.component';
import { MobileMenuButtonComponent } from './mobile-menu-button/mobile-menu-button.component';
import { AuthService } from '../../core/services/auth.service';
import { User } from '@aegisx-boilerplate/types';

// PrimeNG Imports
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, MobileMenuButtonComponent, AvatarModule, MenuModule, ButtonModule],
  styleUrls: ['../layout.responsive.css'],
  template: `
    <div class="flex h-screen bg-gray-50">
      <!-- Mobile Menu Button -->
      <app-mobile-menu-button
        (menuToggle)="onMobileMenuToggle()"
        [isMenuOpen]="isMobileMenuOpen"
        class="block lg:hidden">
      </app-mobile-menu-button>

      <!-- Sidebar -->
      <app-sidebar #sidebar></app-sidebar>

      <!-- Main Content -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Header -->
        <header class="bg-white shadow-sm border-b border-gray-200 px-6 py-4 relative z-40">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <!-- Mobile: Add left padding to account for menu button -->
              <div class="lg:hidden w-12"></div>
              <h1 class="text-2xl font-semibold text-gray-900">{{ pageTitle }}</h1>
            </div>
            <div class="flex items-center space-x-4">
              <button class="p-2 text-gray-500 hover:text-gray-700">
                <i class="pi pi-bell text-lg"></i>
              </button>
              <button class="p-2 text-gray-500 hover:text-gray-700">
                <i class="pi pi-search text-lg"></i>
              </button>

              <!-- User Profile Menu -->
              <div class="relative">
                <button
                  #userMenuButton
                  (click)="userMenu.toggle($event)"
                  class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100">
                  <p-avatar
                    [label]="getUserInitials()"
                    [image]="currentUser?.avatar"
                    size="normal"
                    shape="circle"
                    styleClass="bg-indigo-600">
                  </p-avatar>
                  <span class="text-sm font-medium text-gray-700">{{ currentUser?.name || 'User' }}</span>
                  <i class="pi pi-chevron-down text-xs text-gray-500"></i>
                </button>

                <p-menu
                  #userMenu
                  [model]="userMenuItems"
                  [popup]="true"
                  [style]="{ 'min-width': '12rem' }"
                  styleClass="profile-menu-dropdown">
                </p-menu>
              </div>
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <main class="flex-1 overflow-y-auto p-6">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  @ViewChild('sidebar') sidebar!: SidebarComponent;
  pageTitle = 'Dashboard';
  currentUser: User | null = null;
  userMenuItems: MenuItem[] = [];
  private destroy$ = new Subject<void>();

  authService = inject(AuthService);
  router = inject(Router);

  ngOnInit(): void {
    // Subscribe to auth state changes
    this.authService.getAuthState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(authState => {
        this.currentUser = authState.user;
        this.setupUserMenu();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isMobileMenuOpen(): boolean {
    return this.sidebar?.isMobileMenuOpen || false;
  }

  onMobileMenuToggle() {
    if (this.sidebar) {
      this.sidebar.toggleSidebar();
    }
  }

  getUserInitials(): string {
    if (!this.currentUser) return 'U';
    const names = this.currentUser.name.split(' ');
    if (names.length >= 2) {
      return names[0][0] + names[1][0];
    }
    return this.currentUser.name[0] || 'U';
  }

  private setupUserMenu(): void {
    this.userMenuItems = [
      {
        label: 'Profile',
        icon: 'pi pi-user',
        command: () => this.goToProfile()
      },
      {
        label: 'Settings',
        icon: 'pi pi-cog',
        command: () => this.goToSettings()
      },
      {
        separator: true
      },
      {
        label: 'Logout',
        icon: 'pi pi-sign-out',
        command: () => this.logout()
      }
    ];
  }

  private goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  private goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  private async logout(): Promise<void> {
    try {
      await this.authService.logout();
      // Logout successful, authService will handle navigation
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
}
