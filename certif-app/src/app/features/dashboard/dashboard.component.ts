import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CertificationService } from '../../core/services/certification.service';
import { User } from '../../core/models/user.model';
import { CertificationStatus } from '../../core/models/certification.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container-fluid">
      <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 class="h2">Dashboard</h1>
        <div class="btn-toolbar mb-2 mb-md-0">
          <div class="btn-group me-2">
            <button type="button" class="btn btn-sm btn-outline-secondary" (click)="navigateToAllCertifications()">Ver certificaciones</button>
          </div>
        </div>
      </div>

      <div class="row mb-4">
        <div class="col-12">
          <div class="alert alert-primary border-0" role="alert">
            <h4 class="alert-heading">Bienvenido, {{ currentUser?.firstName }}!</h4>
            <p class="mb-0">Gestiona las certificaciones de tu empresa desde este panel de control.</p>
          </div>
        </div>
      </div>

      <div class="row mb-4">
        <div class="col-xl-3 col-md-6 mb-4">
          <div class="card border-left-primary shadow h-100 py-2 stats-card clickable" (click)="navigateToAllCertifications()">
            <div class="card-body">
              <div class="row no-gutters align-items-center">
                <div class="col mr-2">
                  <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">Total Certificaciones</div>
                  <div class="h5 mb-0 font-weight-bold text-gray-800">{{ stats.total }}</div>
                </div>
                <div class="col-auto">
                  <i class="fas fa-certificate fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
          <div class="card border-left-success shadow h-100 py-2 stats-card clickable" (click)="navigateToActiveCertifications()">
            <div class="card-body">
              <div class="row no-gutters align-items-center">
                <div class="col mr-2">
                  <div class="text-xs font-weight-bold text-success text-uppercase mb-1">Activas</div>
                  <div class="h5 mb-0 font-weight-bold text-gray-800">{{ stats.active }}</div>
                </div>
                <div class="col-auto">
                  <i class="fas fa-check-circle fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
          <div class="card border-left-warning shadow h-100 py-2 stats-card clickable" (click)="navigateToExpiringSoonCertifications()">
            <div class="card-body">
              <div class="row no-gutters align-items-center">
                <div class="col mr-2">
                  <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">Por Expirar</div>
                  <div class="h5 mb-0 font-weight-bold text-gray-800">{{ stats.expiringSoon }}</div>
                </div>
                <div class="col-auto">
                  <i class="fas fa-exclamation-triangle fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
          <div class="card border-left-danger shadow h-100 py-2 stats-card clickable" (click)="navigateToExpiredCertifications()">
            <div class="card-body">
              <div class="row no-gutters align-items-center">
                <div class="col mr-2">
                  <div class="text-xs font-weight-bold text-danger text-uppercase mb-1">Expiradas</div>
                  <div class="h5 mb-0 font-weight-bold text-gray-800">{{ stats.expired }}</div>
                </div>
                <div class="col-auto">
                  <i class="fas fa-times-circle fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col-lg-6 mb-4">
          <div class="card shadow mb-4">
            <div class="card-header py-3">
              <h6 class="m-0 font-weight-bold text-primary">Certificaciones Recientes</h6>
            </div>
            <div class="card-body">
              <div class="list-group list-group-flush" *ngIf="recentCertifications.length > 0; else noCertifications">
                <div class="list-group-item" *ngFor="let cert of recentCertifications">
                  <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">{{ cert.title }}</h6>
                    <small>{{ cert.issueDate | date:'shortDate' }}</small>
                  </div>
                  <p class="mb-1">{{ cert.technology }}</p>
                  <small class="text-muted">{{ cert.employeeName }}</small>
                </div>
              </div>
              <ng-template #noCertifications>
                <p class="text-muted text-center py-3">No hay certificaciones recientes</p>
              </ng-template>
            </div>
          </div>
        </div>

        <div class="col-lg-6 mb-4">
          <div class="card shadow mb-4">
            <div class="card-header py-3">
              <h6 class="m-0 font-weight-bold text-warning">Proximas a Expirar</h6>
            </div>
            <div class="card-body">
              <div class="list-group list-group-flush" *ngIf="expiringSoon.length > 0; else noExpiring">
                <div class="list-group-item" *ngFor="let cert of expiringSoon">
                  <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">{{ cert.title }}</h6>
                    <small class="text-warning">{{ cert.expirationDate | date:'shortDate' }}</small>
                  </div>
                  <p class="mb-1">{{ cert.technology }}</p>
                  <small class="text-muted">{{ cert.employeeName }}</small>
                </div>
              </div>
              <ng-template #noExpiring>
                <p class="text-muted text-center py-3">No hay certificaciones proximas a expirar</p>
              </ng-template>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .border-left-primary { border-left: 0.25rem solid var(--primary-color) !important; }
    .border-left-success { border-left: 0.25rem solid var(--success-color) !important; }
    .border-left-warning { border-left: 0.25rem solid var(--warning-color) !important; }
    .border-left-danger { border-left: 0.25rem solid var(--danger-color) !important; }
    .stats-card.clickable { cursor: pointer; transition: all 0.3s ease; }
    .stats-card.clickable:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important; }
    .stats-card.clickable:active { transform: translateY(0); }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  stats = { total: 0, active: 0, expiringSoon: 0, expired: 0 };
  recentCertifications: any[] = [];
  expiringSoon: any[] = [];
  private subscription?: Subscription;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly certificationService: CertificationService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  navigateToAllCertifications(): void { this.router.navigate(['/certifications']); }
  navigateToActiveCertifications(): void { this.router.navigate(['/certifications'], { queryParams: { status: CertificationStatus.ACTIVE } }); }
  navigateToExpiringSoonCertifications(): void { this.router.navigate(['/certifications'], { queryParams: { status: CertificationStatus.EXPIRING_SOON } }); }
  navigateToExpiredCertifications(): void { this.router.navigate(['/certifications'], { queryParams: { status: CertificationStatus.EXPIRED } }); }

  private loadDashboardData(): void {
    this.subscription = this.certificationService.getCertificationStats().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const data: any = response.data;
          const getStatusCount = (statusName: string, fallbackArr?: any[]): number => {
            if (data.byStatus && data.byStatus[statusName] !== undefined) {
              return data.byStatus[statusName];
            }
            if (fallbackArr && Array.isArray(fallbackArr)) {
              return fallbackArr.length;
            }
            return 0;
          };

          this.stats = {
            total: data.total || 0,
            active: getStatusCount('active'),
            expiringSoon: getStatusCount('expiring_soon', data.expiringSoon),
            expired: getStatusCount('expired')
          };
          this.recentCertifications = data.recent || [];
          this.expiringSoon = data.expiringSoon || [];
        }
      },
      error: () => {
        this.stats = { total: 0, active: 0, expiringSoon: 0, expired: 0 };
        this.recentCertifications = [];
        this.expiringSoon = [];
      }
    });
  }
}
