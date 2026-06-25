import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-settings-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <ul class="nav nav-tabs mb-4">
      <li class="nav-item">
        <a class="nav-link" routerLink="/settings/smtp" routerLinkActive="active">
          <i class="fas fa-envelope me-1"></i> SMTP
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link" routerLink="/settings/audit" routerLinkActive="active">
          <i class="fas fa-clipboard-list me-1"></i> Log Audit
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link" routerLink="/settings/backup" routerLinkActive="active">
          <i class="fas fa-database me-1"></i> Backup
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link" routerLink="/settings/branding" routerLinkActive="active">
          <i class="fas fa-palette me-1"></i> Branding
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link" routerLink="/settings/reports" routerLinkActive="active">
          <i class="fas fa-chart-bar me-1"></i> Reportes
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link" routerLink="/settings/external-api" routerLinkActive="active">
          <i class="fas fa-plug me-1"></i> API Externa
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link" routerLink="/settings/departments" routerLinkActive="active">
          <i class="fas fa-sitemap me-1"></i> Departamentos
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link" routerLink="/settings/positions" routerLinkActive="active">
          <i class="fas fa-user-tag me-1"></i> Cargos
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link" routerLink="/settings/security" routerLinkActive="active">
          <i class="fas fa-shield-alt me-1"></i> Seguridad
        </a>
      </li>
    </ul>
  `
})
export class SettingsNavComponent {}
