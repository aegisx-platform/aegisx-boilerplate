import { Component, ViewChild, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { MobileMenuButtonComponent } from './components/mobile-menu-button/mobile-menu-button.component';
import { AuthService } from '../core/services/auth.service';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, MobileMenuButtonComponent, MenuModule],
  template: `
    <div class="flex h-screen bg-gray-100">
      <!-- Mobile Menu Button -->
      <app-mobile-menu-button
        (menuToggle)="onMobileMenuToggle()"
        class="block lg:hidden">
      </app-mobile-menu-button>

      <!-- Sidebar -->
      <app-sidebar #sidebar></app-sidebar>

      <!-- Main Content -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Header -->
        <header class="bg-white shadow-sm border-b border-gray-200 lg:ml-0 relative z-40 overflow-visible">
          <div class="px-4 sm:px-6 lg:px-8 py-4 overflow-visible">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <!-- Mobile: Add left padding to account for menu button -->
                <div class="lg:hidden w-10"></div>
                <h1 class="text-xl font-semibold text-gray-900">
                  AegisX Healthcare Management
                </h1>
              </div>

              <!-- Header Actions -->
              <div class="flex items-center space-x-4">
                <!-- Notifications -->
                <button class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                  <i class="pi pi-bell text-lg"></i>
                </button>

                <!-- Search -->
                <button class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                  <i class="pi pi-search text-lg"></i>
                </button>

                <!-- Profile Dropdown with PrimeNG Menu -->
                <div class="relative">
                  <button
                    (click)="profileMenu.toggle($event)"
                    class="flex items-center space-x-2 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                    <img
                      class="w-6 h-6 rounded-full"
                      src="https://ui-avatars.com/api/?name=Admin+User&background=6366f1&color=fff&size=24"
                      alt="Profile"
                    />
                    <i class="pi pi-chevron-down text-xs"></i>
                  </button>

                  <!-- PrimeNG Menu -->
                  <p-menu
                    #profileMenu
                    [model]="profileMenuItems"
                    [popup]="true"
                    [style]="{ 'min-width': '12rem' }"
                    styleClass="profile-menu">
                    <ng-template pTemplate="item" let-item>
                      <div class="p-menuitem-content">
                        <a class="p-menuitem-link flex items-center px-3 py-2 text-sm">
                          <i [class]="item.icon" class="mr-3 text-gray-500"></i>
                          <span class="text-gray-700">{{ item.label }}</span>
                        </a>
                      </div>
                    </ng-template>
                  </p-menu>
                </div>
              </div>
            </div>
          </div>
        </header>

        <!-- Main Content Area -->
        <main class="flex-1 overflow-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
})
export class LayoutComponent {
  @ViewChild('sidebar') sidebar!: SidebarComponent;

  router = inject(Router);
  authService = inject(AuthService);

  profileMenuItems: MenuItem[] = [
    {
      label: 'Admin User',
      items: [
        {
          label: 'Profile',
          icon: 'pi pi-user',
          command: () => this.navigateToProfile()
        },
        {
          label: 'Settings',
          icon: 'pi pi-cog',
          command: () => this.navigateToSettings()
        },
        {
          separator: true
        },
        {
          label: 'Logout',
          icon: 'pi pi-sign-out',
          command: () => this.logout()
        }
      ]
    }
  ];

  onMobileMenuToggle() {
    if (this.sidebar) {
      this.sidebar.toggleSidebar();
    }
  }

  navigateToProfile() {
    this.router.navigate(['/profile']);
  }

  navigateToSettings() {
    this.router.navigate(['/settings']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
