import { Routes } from '@angular/router';
import { AdminGuard, AuthGuard, UsersGuard } from './core/guards/auth.guard';

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
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./features/auth/verify-email/verify-email.component').then(m => m.VerifyEmailComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'force-password-change',
    canActivate: [AuthGuard],
    loadComponent: () => import('./features/auth/force-password-change/force-password-change.component').then(m => m.ForcePasswordChangeComponent)
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
    path: 'settings',
    canActivate: [AdminGuard],
    loadChildren: () => import('./features/settings/settings.routes').then(m => m.routes)
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
