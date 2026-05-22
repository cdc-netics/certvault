import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'smtp',
    pathMatch: 'full'
  },
  {
    path: 'smtp',
    loadComponent: () => import('./smtp-settings/smtp-settings.component').then(m => m.SmtpSettingsComponent)
  },
  {
    path: 'audit',
    loadComponent: () => import('./audit-settings/audit-settings.component').then(m => m.AuditSettingsComponent)
  },
  {
    path: 'backup',
    loadComponent: () => import('./backup-settings/backup-settings.component').then(m => m.BackupSettingsComponent)
  },
  {
    path: 'branding',
    loadComponent: () => import('./branding-settings/branding-settings.component').then(m => m.BrandingSettingsComponent)
  },
  {
    path: 'reports',
    loadComponent: () => import('./reports-settings/reports-settings.component').then(m => m.ReportsSettingsComponent)
  },
  {
    path: 'external-api',
    loadComponent: () => import('./external-api-settings/external-api-settings.component').then(m => m.ExternalApiSettingsComponent)
  }
];
