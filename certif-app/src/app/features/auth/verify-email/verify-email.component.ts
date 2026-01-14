import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-vh-100 d-flex align-items-center justify-content-center bg-light-custom">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-8 col-lg-6">
            <div class="card shadow-sm-custom">
              <div class="card-body p-4 text-center">
                <h3 class="fw-bold text-primary mb-2">Verificar cuenta</h3>
                <p class="text-muted mb-4">Estamos validando tu enlace...</p>

                <div *ngIf="state === 'loading'" class="my-4">
                  <div class="spinner-border text-primary" role="status"></div>
                </div>

                <div *ngIf="state === 'success'" class="alert alert-success">
                  <div class="fw-semibold">¡Cuenta verificada!</div>
                  <div class="small text-muted">Ya puedes iniciar sesión con tu email y contraseña.</div>
                </div>

                <div *ngIf="state === 'error'" class="alert alert-warning">
                  <div class="fw-semibold">El enlace no es válido o expiró.</div>
                  <div class="small text-muted">Solicita un nuevo correo de verificación o regístrate nuevamente.</div>
                </div>

                <div class="mt-4">
                  <a routerLink="/login" class="btn btn-primary w-100">Ir al login</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bg-light-custom { background: linear-gradient(135deg, #00C3B4 0%, #008f86 100%); }
    .card { backdrop-filter: blur(10px); background: rgba(255,255,255,0.97); }
  `]
})
export class VerifyEmailComponent implements OnInit, OnDestroy {
  state: 'loading' | 'success' | 'error' = 'loading';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const token = params.get('token') || '';
      const email = params.get('email') || '';
      if (!token) {
        this.state = 'error';
        return;
      }
      this.authService.verifyEmail({ token, email: email || undefined })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.state = response.success ? 'success' : 'error';
          },
          error: () => {
            this.state = 'error';
          }
        });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
