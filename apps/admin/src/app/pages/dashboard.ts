import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    ProgressBarModule,
    TagModule,
    AvatarModule,
    BadgeModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  // Metrics data
  metrics = [
    {
      title: 'Total Users',
      value: '1,234',
      icon: 'pi pi-users',
      trend: '+12%',
      trendType: 'positive',
      color: 'primary',
      progress: 75
    },
    {
      title: 'Active Sessions',
      value: '156',
      icon: 'pi pi-desktop',
      trend: '+8%',
      trendType: 'positive',
      color: 'success',
      progress: 60
    },
    {
      title: 'Revenue',
      value: '$45.2K',
      icon: 'pi pi-dollar',
      trend: '+23%',
      trendType: 'positive',
      color: 'warning',
      progress: 85
    },
    {
      title: 'API Calls',
      value: '12.5K',
      icon: 'pi pi-chart-line',
      trend: '-2%',
      trendType: 'negative',
      color: 'info',
      progress: 45
    }
  ];

  // Chart data
  chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Users',
        data: [65, 59, 80, 81, 56, 55],
        fill: false,
        borderColor: '#3b82f6',
        backgroundColor: '#3b82f6',
        tension: 0.4
      },
      {
        label: 'Revenue',
        data: [28, 48, 40, 19, 86, 27],
        fill: false,
        borderColor: '#10b981',
        backgroundColor: '#10b981',
        tension: 0.4
      }
    ]
  };

  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  // Recent activities timeline
  activities = [
    {
      title: 'New user registered',
      description: 'John Doe created an account',
      time: '2 minutes ago',
      icon: 'pi pi-user-plus',
      color: 'success'
    },
    {
      title: 'System backup completed',
      description: 'Daily backup process finished successfully',
      time: '1 hour ago',
      icon: 'pi pi-check-circle',
      color: 'info'
    },
    {
      title: 'Security alert',
      description: 'Failed login attempts detected',
      time: '3 hours ago',
      icon: 'pi pi-exclamation-triangle',
      color: 'warning'
    },
    {
      title: 'Server maintenance',
      description: 'Scheduled maintenance completed',
      time: '5 hours ago',
      icon: 'pi pi-cog',
      color: 'secondary'
    }
  ];

  // Recent users table
  recentUsers = [
    {
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Admin',
      status: 'Active',
      avatar: null,
      lastLogin: '2 hours ago'
    },
    {
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'User',
      status: 'Active',
      avatar: null,
      lastLogin: '1 day ago'
    },
    {
      name: 'Mike Johnson',
      email: 'mike@example.com',
      role: 'Moderator',
      status: 'Inactive',
      avatar: null,
      lastLogin: '3 days ago'
    }
  ];

  // Quick actions menu
  quickActions = [
    {
      label: 'Add User',
      icon: 'pi pi-user-plus',
      command: () => this.addUser()
    },
    {
      label: 'Generate Report',
      icon: 'pi pi-file-pdf',
      command: () => this.generateReport()
    },
    {
      label: 'System Settings',
      icon: 'pi pi-cog',
      command: () => this.openSettings()
    },
    {
      label: 'Backup Data',
      icon: 'pi pi-cloud-download',
      command: () => this.backupData()
    }
  ];

  // Action methods
  addUser() {
    console.log('Add user clicked');
  }

  generateReport() {
    console.log('Generate report clicked');
  }

  openSettings() {
    console.log('Settings clicked');
  }

  backupData() {
    console.log('Backup clicked');
  }

  // Utility methods
  getSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warning';
      case 'blocked':
        return 'danger';
      default:
        return 'info';
    }
  }

  getTrendIcon(trendType: string): string {
    return trendType === 'positive' ? 'pi pi-arrow-up' : 'pi pi-arrow-down';
  }

  getTrendSeverity(trendType: string): 'success' | 'danger' {
    return trendType === 'positive' ? 'success' : 'danger';
  }

  getActivitySeverity(color: string): 'success' | 'info' | 'warning' | 'secondary' {
    switch (color) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'secondary';
    }
  }

  getUserInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('');
  }
}
