import { Route } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { GuestGuard } from './core/guards/guest.guard';

export const appRoutes: Route[] = [
  // Public routes (authentication)
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
    canActivate: [GuestGuard]
  },
  
  // Protected routes (require authentication)
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'charts',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'projects',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'events',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'labels',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'feed',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'access',
        loadComponent: () => import('./features/user-management/user-management.component').then(m => m.UserManagementComponent)
      },
      {
        path: 'rbac',
        loadComponent: () => import('./features/rbac/rbac.component').then(m => m.RbacComponent)
      },
      {
        path: 'api-keys',
        loadChildren: () => import('./features/api-key/api-key.routes').then(m => m.API_KEY_ROUTES)
      },
      {
        path: 'profile',
        loadChildren: () => import('./features/profile/profile.routes').then(m => m.PROFILE_ROUTES)
      },
      {
        path: 'storage',
        loadChildren: () => import('./features/storage/storage.routes').then(m => m.default)
      },
      {
        path: 'configuration',
        loadChildren: () => import('./features/configuration/configuration.routes').then(m => m.default)
      },
      {
        path: 'support',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      }
    ]
  },
  
  // Catch all route
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
