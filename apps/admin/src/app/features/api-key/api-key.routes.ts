import { Routes } from '@angular/router';

export const API_KEY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/api-key-list/api-key-list.component').then(m => m.ApiKeyListComponent),
    data: {
      title: 'API Keys',
      description: 'Manage your API keys for programmatic access',
      breadcrumb: 'API Keys'
    }
  }
];