import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-settings-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="nav flex-column nav-pills settings-nav-menu">
      <a class="nav-link d-flex align-items-center py-2.5 px-3 mb-1 rounded-2" routerLink="/settings/smtp" routerLinkActive="active">
        <i class="fas fa-envelope me-2-icon"></i> <span>SMTP</span>
      </a>
      <a class="nav-link d-flex align-items-center py-2.5 px-3 mb-1 rounded-2" routerLink="/settings/audit" routerLinkActive="active">
        <i class="fas fa-clipboard-list me-2-icon"></i> <span>Log Audit</span>
      </a>
      <a class="nav-link d-flex align-items-center py-2.5 px-3 mb-1 rounded-2" routerLink="/settings/backup" routerLinkActive="active">
        <i class="fas fa-database me-2-icon"></i> <span>Backup</span>
      </a>
      <a class="nav-link d-flex align-items-center py-2.5 px-3 mb-1 rounded-2" routerLink="/settings/branding" routerLinkActive="active">
        <i class="fas fa-palette me-2-icon"></i> <span>Branding</span>
      </a>
      <a class="nav-link d-flex align-items-center py-2.5 px-3 mb-1 rounded-2" routerLink="/settings/reports" routerLinkActive="active">
        <i class="fas fa-chart-bar me-2-icon"></i> <span>Reportes</span>
      </a>
      <a class="nav-link d-flex align-items-center py-2.5 px-3 mb-1 rounded-2" routerLink="/settings/external-api" routerLinkActive="active">
        <i class="fas fa-plug me-2-icon"></i> <span>API Externa</span>
      </a>
      <a class="nav-link d-flex align-items-center py-2.5 px-3 mb-1 rounded-2" routerLink="/settings/departments" routerLinkActive="active">
        <i class="fas fa-sitemap me-2-icon"></i> <span>Departamentos</span>
      </a>
      <a class="nav-link d-flex align-items-center py-2.5 px-3 mb-1 rounded-2" routerLink="/settings/positions" routerLinkActive="active">
        <i class="fas fa-user-tag me-2-icon"></i> <span>Cargos</span>
      </a>
      <a class="nav-link d-flex align-items-center py-2.5 px-3 mb-1 rounded-2" routerLink="/settings/security" routerLinkActive="active">
        <i class="fas fa-shield-alt me-2-icon"></i> <span>Seguridad</span>
      </a>
    </div>
  `,
  styles: [`
    .settings-nav-menu .nav-link {
      color: #495057;
      font-weight: 500;
      font-size: 0.92rem;
      transition: all 0.2s ease-in-out;
      border: 1px solid transparent;
    }
    
    .settings-nav-menu .nav-link:hover {
      background-color: #eef1f6;
      color: #0f172a;
    }
    
    .settings-nav-menu .nav-link.active {
      background-color: var(--primary-color, #0d6efd);
      color: #ffffff;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    
    .settings-nav-menu .nav-link.active .me-2-icon {
      color: #ffffff !important;
    }
    
    .me-2-icon {
      font-size: 1rem;
      width: 24px;
      text-align: center;
      margin-right: 8px;
      color: #64748b;
      transition: color 0.2s ease;
    }
  `]
})
export class SettingsNavComponent {}
