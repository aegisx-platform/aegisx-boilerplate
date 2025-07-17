import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

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
    <div class="w-64 bg-gray-900 text-white flex flex-col">
      <!-- Logo -->
      <div class="p-6 border-b border-gray-800">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <i class="pi pi-chart-line text-white text-sm"></i>
          </div>
          <span class="text-xl font-bold">AegisX</span>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-4 py-6 space-y-2">
        <div class="mb-6">
          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Dashboards
          </h3>
          <div *ngFor="let item of dashboardItems" 
               class="flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors"
               [class.bg-indigo-600]="item.isActive"
               [class.text-white]="item.isActive"
               [class.text-gray-300]="!item.isActive"
               [class.hover:bg-gray-800]="!item.isActive"
               [routerLink]="item.route">
            <i [class]="item.icon" class="mr-3 text-lg"></i>
            {{ item.label }}
          </div>
        </div>

        <div class="mb-6">
          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Pages
          </h3>
          <div *ngFor="let item of pageItems" 
               class="flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors"
               [class.bg-indigo-600]="item.isActive"
               [class.text-white]="item.isActive"
               [class.text-gray-300]="!item.isActive"
               [class.hover:bg-gray-800]="!item.isActive"
               [routerLink]="item.route">
            <i [class]="item.icon" class="mr-3 text-lg"></i>
            {{ item.label }}
          </div>
        </div>

        <div class="mb-6">
          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Analytics
          </h3>
          <div *ngFor="let item of analyticsItems" 
               class="flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors"
               [class.bg-indigo-600]="item.isActive"
               [class.text-white]="item.isActive"
               [class.text-gray-300]="!item.isActive"
               [class.hover:bg-gray-800]="!item.isActive"
               [routerLink]="item.route">
            <i [class]="item.icon" class="mr-3 text-lg"></i>
            {{ item.label }}
          </div>
        </div>
      </nav>

      <!-- User Profile -->
      <div class="p-4 border-t border-gray-800">
        <div class="flex items-center space-x-3">
          <img class="w-10 h-10 rounded-full" 
               src="https://ui-avatars.com/api/?name=Florence+Shaw&background=6366f1&color=fff" 
               alt="User">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate">Florence Shaw</p>
            <p class="text-xs text-gray-400 truncate">hi&#64;florenceshaw.com</p>
          </div>
          <button class="p-1 text-gray-400 hover:text-white">
            <i class="pi pi-cog text-sm"></i>
          </button>
        </div>
      </div>
    </div>
  `
})
export class SidebarComponent {
  dashboardItems: MenuItem[] = [
    { label: 'Overview', icon: 'pi pi-home', route: '/dashboard', isActive: true },
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