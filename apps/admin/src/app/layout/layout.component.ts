import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { MobileMenuButtonComponent } from './components/mobile-menu-button/mobile-menu-button.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, MobileMenuButtonComponent],
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
        <header class="bg-white shadow-sm border-b border-gray-200 lg:ml-0">
          <div class="px-4 sm:px-6 lg:px-8 py-4">
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

                <!-- Profile Dropdown -->
                <div class="relative">
                  <button class="flex items-center space-x-2 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                    <img
                      class="w-6 h-6 rounded-full"
                      src="https://ui-avatars.com/api/?name=Admin+User&background=6366f1&color=fff&size=24"
                      alt="Profile"
                    />
                    <i class="pi pi-chevron-down text-xs"></i>
                  </button>
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

  onMobileMenuToggle() {
    if (this.sidebar) {
      this.sidebar.toggleSidebar();
    }
  }
}
