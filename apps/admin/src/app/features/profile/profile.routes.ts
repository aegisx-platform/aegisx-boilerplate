import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      {
        path: 'edit',
        loadComponent: () => 
          import('./components/profile-edit/profile-edit.component').then(m => m.ProfileEditComponent),
        data: { title: 'Edit Profile' }
      },
      {
        path: '',
        redirectTo: 'edit',
        pathMatch: 'full'
      }
    ]
  }
];