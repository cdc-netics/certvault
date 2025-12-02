import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./certifications-list/certifications-list.component').then(m => m.CertificationsListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./certification-form/certification-form.component').then(m => m.CertificationFormComponent)
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./certification-form/certification-form.component').then(m => m.CertificationFormComponent)
  }
];