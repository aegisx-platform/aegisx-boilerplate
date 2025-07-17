import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { MobileMenuButtonComponent } from './mobile-menu-button/mobile-menu-button.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, MobileMenuButtonComponent],
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
        <header class="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
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
              <div class="flex items-center space-x-3">
                <img class="w-8 h-8 rounded-full" src="https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff" alt="Admin">
                <span class="text-sm font-medium text-gray-700">Admin User</span>
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
export class MainLayoutComponent {
  @ViewChild('sidebar') sidebar!: SidebarComponent;
  pageTitle = 'Dashboard';

  get isMobileMenuOpen(): boolean {
    return this.sidebar?.isMobileMenuOpen || false;
  }

  onMobileMenuToggle() {
    if (this.sidebar) {
      this.sidebar.toggleSidebar();
    }
  }
}
