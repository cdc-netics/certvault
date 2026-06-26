import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SettingsNavComponent } from './settings-nav.component';
import { BackButtonComponent } from '../../shared/components/back-button/back-button.component';

@Component({
  selector: 'app-settings-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SettingsNavComponent, BackButtonComponent],
  template: `
    <div class="container-fluid py-4">
      <!-- Encabezado de Configuración Principal -->
      <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div>
          <h1 class="h2 mb-1 fw-bold text-dark">
            <i class="fas fa-sliders-h text-primary me-2"></i>
            Panel de Configuración
          </h1>
          <p class="text-muted mb-0 d-none d-md-block">Administra el servidor SMTP, registros de auditoría, copias de seguridad, departamentos y seguridad global.</p>
        </div>
        <app-back-button [customRoute]="'/dashboard'" [label]="'Volver al Dashboard'"></app-back-button>
      </div>

      <!-- Diseño moderno con Sidebar -->
      <div class="row g-4">
        <!-- Sidebar de navegación lateral -->
        <div class="col-lg-3 col-xl-2">
          <div class="card border-0 shadow-sm bg-light p-2 rounded-3">
            <div class="card-body p-1">
              <app-settings-nav></app-settings-nav>
            </div>
          </div>
        </div>

        <!-- Área de contenido de sub-configuraciones -->
        <div class="col-lg-9 col-xl-10">
          <div class="settings-content-card bg-white p-4 rounded-3 border shadow-sm">
            <router-outlet></router-outlet>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-content-card {
      min-height: 550px;
    }
  `]
})
export class SettingsLayoutComponent {}
