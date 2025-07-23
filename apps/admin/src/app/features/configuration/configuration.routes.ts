import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

export const configurationRoutes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    loadComponent: () => 
      import('./components/configuration-manager/configuration-manager.component').then(m => m.ConfigurationManagerComponent),
    data: {
      title: 'Configuration Management',
      breadcrumb: 'Configuration',
      description: 'Manage system configurations with hot reload support'
    }
  }
];

export default configurationRoutes;