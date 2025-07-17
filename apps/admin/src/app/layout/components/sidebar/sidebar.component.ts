import { Component, OnInit, HostListener, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ResponsiveService } from '../../../shared/services/responsive.service';
import { Subscription } from 'rxjs';

interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  children?: MenuItem[];
  isActive?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Mobile Overlay -->
    <div
      *ngIf="isMobileMenuOpen"
      class="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
      (click)="closeMobileMenu()"
      (keyup.escape)="closeMobileMenu()"
      tabindex="0"
      role="button"
      aria-label="Close mobile menu"
    ></div>

    <div
      [class]="getSidebarClasses()"
      class="bg-gray-900 text-white flex flex-col h-screen transition-all duration-300"
    >
      <!-- Logo -->
      <div class="p-6 border-b border-gray-800 flex-shrink-0">
        <!-- When expanded: show logo and toggle -->
        <div *ngIf="!isCollapsed || isMobile" class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div
              class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center"
            >
              <i class="pi pi-chart-line text-white text-sm"></i>
            </div>
            <span class="text-xl font-bold transition-all">AegisX</span>
          </div>
          <!-- Toggle button for expanded state (desktop) or close button (mobile) -->
          <button
            (click)="isMobile ? closeMobileMenu() : toggleSidebar()"
            class="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200"
            [title]="isMobile ? 'ปิด menu' : 'ย่อ sidebar'"
          >
            <i [class]="isMobile ? 'pi pi-times text-lg' : 'pi pi-angle-left text-base'"></i>
          </button>
        </div>

        <!-- When collapsed: only show toggle button -->
        <div *ngIf="isCollapsed && !isMobile" class="flex justify-center">
          <button
            (click)="toggleSidebar()"
            class="p-2 rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors duration-200"
            title="ขยาย sidebar"
          >
            <i class="pi pi-chevron-right text-xs"></i>
          </button>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <div class="mb-6">
          <h3
            [class.hidden]="isCollapsed && !isMobile"
            class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3"
          >
            Dashboards
          </h3>
          <a
            *ngFor="let item of dashboardItems"
            class="flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors group"
            [class.bg-indigo-600]="item.isActive"
            [class.text-white]="item.isActive"
            [class.text-gray-300]="!item.isActive"
            [class.hover:bg-gray-800]="!item.isActive"
            [class.justify-center]="isCollapsed && !isMobile"
            [routerLink]="item.route"
            [title]="isCollapsed && !isMobile ? item.label : ''"
            (click)="onMenuItemClick()"
            (keyup.enter)="onMenuItemClick()"
            role="button"
            tabindex="0"
          >
            <i
              [class]="item.icon"
              class="text-lg"
              [class.mr-3]="!isCollapsed || isMobile"
            ></i>
            <span [class.hidden]="isCollapsed && !isMobile">{{ item.label }}</span>
          </a>
        </div>

        <div class="mb-6">
          <h3
            [class.hidden]="isCollapsed && !isMobile"
            class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3"
          >
            Pages
          </h3>
          <a
            *ngFor="let item of pageItems"
            class="flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors"
            [class.bg-indigo-600]="item.isActive"
            [class.text-white]="item.isActive"
            [class.text-gray-300]="!item.isActive"
            [class.hover:bg-gray-800]="!item.isActive"
            [class.justify-center]="isCollapsed && !isMobile"
            [routerLink]="item.route"
            [title]="isCollapsed && !isMobile ? item.label : ''"
            (click)="onMenuItemClick()"
            (keyup.enter)="onMenuItemClick()"
            role="button"
            tabindex="0"
          >
            <i
              [class]="item.icon"
              class="text-lg"
              [class.mr-3]="!isCollapsed || isMobile"
            ></i>
            <span [class.hidden]="isCollapsed && !isMobile">{{ item.label }}</span>
          </a>
        </div>

        <div class="mb-6">
          <h3
            [class.hidden]="isCollapsed && !isMobile"
            class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3"
          >
            Analytics
          </h3>
          <a
            *ngFor="let item of analyticsItems"
            class="flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors"
            [class.bg-indigo-600]="item.isActive"
            [class.text-white]="item.isActive"
            [class.text-gray-300]="!item.isActive"
            [class.hover:bg-gray-800]="!item.isActive"
            [class.justify-center]="isCollapsed && !isMobile"
            [routerLink]="item.route"
            [title]="isCollapsed && !isMobile ? item.label : ''"
            (click)="onMenuItemClick()"
            (keyup.enter)="onMenuItemClick()"
            role="button"
            tabindex="0"
          >
            <i
              [class]="item.icon"
              class="text-lg"
              [class.mr-3]="!isCollapsed || isMobile"
            ></i>
            <span [class.hidden]="isCollapsed && !isMobile">{{ item.label }}</span>
          </a>
        </div>
      </nav>

      <!-- User Profile -->
      <div class="p-4 border-t border-gray-800 flex-shrink-0">
        <!-- When collapsed (desktop only): center profile -->
        <div *ngIf="isCollapsed && !isMobile" class="flex justify-center">
          <div class="relative">
            <img
              class="w-8 h-8 rounded-full ring-2 ring-indigo-500 ring-offset-1 ring-offset-gray-900"
              src="https://ui-avatars.com/api/?name=Admin+User&background=6366f1&color=fff&size=32"
              alt="User"
              title="Admin User"
            />
            <div
              class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"
            ></div>
          </div>
        </div>

        <!-- When expanded or mobile: full profile layout -->
        <div *ngIf="!isCollapsed || isMobile" class="flex items-center space-x-3">
          <!-- Profile Avatar -->
          <div class="relative">
            <img
              class="w-10 h-10 rounded-full ring-2 ring-indigo-500 ring-offset-2 ring-offset-gray-900"
              src="https://ui-avatars.com/api/?name=Admin+User&background=6366f1&color=fff"
              alt="User"
            />
            <div
              class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"
            ></div>
          </div>

          <!-- User Info -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate">Admin User</p>
            <p class="text-xs text-gray-400 truncate">admin&#64;aegisx.com</p>
          </div>

          <!-- Settings Button -->
          <button
            class="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            title="Settings"
          >
            <i class="pi pi-cog text-sm"></i>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class SidebarComponent implements OnInit, OnDestroy {
  isCollapsed = false;
  isMobileMenuOpen = false;
  isMobile = false;
  private responsiveSubscription?: Subscription;
  private responsiveService = inject(ResponsiveService);

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  ngOnInit() {
    this.checkScreenSize();

    // Subscribe to responsive service for better state management
    this.responsiveSubscription = this.responsiveService.getResponsiveState().subscribe(state => {
      this.isMobile = state.isMobile || state.isTablet;
      if (!this.isMobile) {
        this.isMobileMenuOpen = false;
      }
    });
  }

  ngOnDestroy() {
    this.responsiveSubscription?.unsubscribe();
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth < 1024; // lg breakpoint
    if (!this.isMobile) {
      this.isMobileMenuOpen = false;
    }
  }

  getSidebarClasses() {
    let classes = '';

    if (this.isMobile) {
      // Mobile: fixed positioned, full height, slide in/out
      classes = this.isMobileMenuOpen
        ? 'fixed inset-y-0 left-0 z-50 w-64 transform translate-x-0 lg:translate-x-0 lg:static lg:inset-0'
        : 'fixed inset-y-0 left-0 z-50 w-64 transform -translate-x-full lg:translate-x-0 lg:static lg:inset-0';
    } else {
      // Desktop: static positioning with width changes
      classes = this.isCollapsed ? 'w-16' : 'w-64';
    }

    return classes;
  }

  toggleSidebar() {
    if (this.isMobile) {
      this.isMobileMenuOpen = !this.isMobileMenuOpen;
    } else {
      this.isCollapsed = !this.isCollapsed;
    }
  }

  closeMobileMenu() {
    if (this.isMobile) {
      this.isMobileMenuOpen = false;
    }
  }

  onMenuItemClick() {
    // Close mobile menu when item is clicked on mobile
    if (this.isMobile) {
      this.closeMobileMenu();
    }
  }

  dashboardItems: MenuItem[] = [
    {
      label: 'Overview',
      icon: 'pi pi-home',
      route: '/dashboard',
      isActive: true,
    },
    { label: 'Analyze', icon: 'pi pi-chart-pie', route: '/analytics' },
  ];

  pageItems: MenuItem[] = [
    { label: 'All charts', icon: 'pi pi-chart-bar', route: '/charts' },
    { label: 'All projects', icon: 'pi pi-folder', route: '/projects' },
    { label: 'Explore events', icon: 'pi pi-calendar', route: '/events' },
    { label: 'Visual labels', icon: 'pi pi-tags', route: '/labels' },
    { label: 'Live data feed', icon: 'pi pi-rss', route: '/feed' },
    { label: 'Manage access', icon: 'pi pi-users', route: '/access' },
  ];

  analyticsItems: MenuItem[] = [
    { label: 'Settings', icon: 'pi pi-cog', route: '/settings' },
    { label: 'Support', icon: 'pi pi-question-circle', route: '/support' },
  ];
}
