import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

export const storageRoutes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    loadComponent: () => 
      import('./components/file-manager/file-manager.component').then(m => m.FileManagerComponent),
    data: {
      title: 'File Storage',
      breadcrumb: 'Storage'
    }
  }
];

export default storageRoutes;