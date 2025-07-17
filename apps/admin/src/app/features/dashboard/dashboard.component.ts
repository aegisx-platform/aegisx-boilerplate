import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, ProgressBarModule, TagModule],
  template: `
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Overview</h1>
          <p class="mt-1 text-sm text-gray-500">Welcome back, here's what's happening with your projects.</p>
        </div>
        <div class="flex items-center space-x-3">
          <button class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <i class="pi pi-download mr-2"></i>
            Export
          </button>
          <button class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
            <i class="pi pi-plus mr-2"></i>
            New project
          </button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div *ngFor="let stat of stats" class="bg-white rounded-lg border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <i [class]="stat.icon" class="text-2xl text-gray-400"></i>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-500">{{ stat.label }}</p>
                <p class="text-2xl font-bold text-gray-900">{{ stat.value }}</p>
              </div>
            </div>
            <div class="flex flex-col items-end">
              <span [class]="getChangeClass(stat.changeType)" class="text-sm font-medium">
                {{ stat.change }}
              </span>
              <span class="text-xs text-gray-500">vs last month</span>
            </div>
          </div>
          <div class="mt-4">
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div [style.width.%]="stat.progress" 
                   [class]="getProgressClass(stat.changeType)"
                   class="h-2 rounded-full transition-all duration-300"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Recent Projects -->
        <div class="lg:col-span-2">
          <div class="bg-white rounded-lg border border-gray-200">
            <div class="px-6 py-4 border-b border-gray-200">
              <h3 class="text-lg font-medium text-gray-900">Recent Projects</h3>
              <p class="text-sm text-gray-500">Your latest project activity</p>
            </div>
            <div class="p-6">
              <div class="space-y-4">
                <div *ngFor="let project of recentProjects" class="flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <div [style.background-color]="project.color" class="w-3 h-3 rounded-full"></div>
                    <div>
                      <p class="text-sm font-medium text-gray-900">{{ project.name }}</p>
                      <p class="text-xs text-gray-500">{{ project.description }}</p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <span class="text-xs text-gray-500">{{ project.date }}</span>
                    <span [class]="getStatusClass(project.status)" 
                          class="px-2 py-1 text-xs font-medium rounded-full">
                      {{ project.status }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="bg-white rounded-lg border border-gray-200">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div class="p-6">
            <div class="space-y-3">
              <button *ngFor="let action of quickActions" 
                      class="w-full flex items-center px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <i [class]="action.icon" class="mr-3 text-lg text-gray-400"></i>
                {{ action.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent {
  stats = [
    {
      label: 'Total Projects',
      value: '24',
      change: '+12%',
      changeType: 'positive',
      icon: 'pi pi-folder',
      progress: 75
    },
    {
      label: 'Active Users',
      value: '2,420',
      change: '+8%',
      changeType: 'positive',
      icon: 'pi pi-users',
      progress: 60
    },
    {
      label: 'Revenue',
      value: '$54,200',
      change: '+23%',
      changeType: 'positive',
      icon: 'pi pi-dollar',
      progress: 85
    },
    {
      label: 'Conversion',
      value: '3.2%',
      change: '-2%',
      changeType: 'negative',
      icon: 'pi pi-chart-line',
      progress: 32
    }
  ];

  recentProjects = [
    {
      name: 'Mobile App Redesign',
      description: 'Updated the mobile application UI',
      date: '2 hours ago',
      status: 'In Progress',
      color: '#3B82F6'
    },
    {
      name: 'Dashboard Analytics',
      description: 'Implemented new analytics features',
      date: '1 day ago',
      status: 'Completed',
      color: '#10B981'
    },
    {
      name: 'API Integration',
      description: 'Connected third-party services',
      date: '3 days ago',
      status: 'Review',
      color: '#F59E0B'
    },
    {
      name: 'User Authentication',
      description: 'Enhanced security features',
      date: '1 week ago',
      status: 'Completed',
      color: '#6366F1'
    }
  ];

  quickActions = [
    { label: 'Create new project', icon: 'pi pi-plus' },
    { label: 'Invite team members', icon: 'pi pi-user-plus' },
    { label: 'Generate reports', icon: 'pi pi-chart-bar' },
    { label: 'Settings', icon: 'pi pi-cog' }
  ];

  getChangeClass(changeType: string): string {
    return changeType === 'positive' 
      ? 'text-green-600' 
      : 'text-red-600';
  }

  getProgressClass(changeType: string): string {
    return changeType === 'positive' 
      ? 'bg-green-500' 
      : 'bg-red-500';
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      case 'review':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}