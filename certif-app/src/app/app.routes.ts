import { Routes } from '@angular/router';
import { AuthGuard, UsersGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'certifications',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/certifications/certifications.routes').then(m => m.routes)
  },
  {
    path: 'users',
    canActivate: [UsersGuard],
    loadChildren: () => import('./features/users/users.routes').then(m => m.routes)
  },
  {
    path: 'profile',
    canActivate: [AuthGuard],
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
