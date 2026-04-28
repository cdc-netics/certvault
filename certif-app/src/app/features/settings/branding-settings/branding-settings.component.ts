import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';
import { BrandingSettings, SettingsService } from '../../../core/services/settings.service';
import { SettingsNavComponent } from '../settings-nav.component';

@Component({
  selector: 'app-branding-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BackButtonComponent, SettingsNavComponent],
  template: `
    <div class="container-fluid">
      <div class="d-flex justify-content-between align-items-center pt-3 pb-2 mb-3 border-bottom">
        <div>
          <h1 class="h2 mb-1"><i class="fas fa-palette me-2"></i>Branding</h1>
          <p class="text-muted mb-0">Logos de la app, login y reportes.</p>
        </div>
        <app-back-button [customRoute]="'/dashboard'" [label]="'Volver al Dashboard'"></app-back-button>
      </div>
      <app-settings-nav></app-settings-nav>

      <div class="alert alert-success" *ngIf="successMessage">{{ successMessage }}</div>
      <div class="alert alert-danger" *ngIf="errorMessage">{{ errorMessage }}</div>

      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="row g-4">
          <div class="col-lg-6">
            <div class="card">
              <div class="card-header"><h5 class="mb-0">Identidad</h5></div>
              <div class="card-body">
                <div class="mb-3">
                  <label class="form-label">Nombre aplicacion</label>
                  <input class="form-control" formControlName="appName">
                </div>
                <div class="mb-3">
                  <label class="form-label">Empresa</label>
                  <input class="form-control" formControlName="companyName">
                </div>
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Color principal</label>
                    <input class="form-control form-control-color" type="color" formControlName="primaryColor">
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Color secundario</label>
                    <input class="form-control form-control-color" type="color" formControlName="secondaryColor">
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label">Pie de reportes</label>
                  <textarea class="form-control" rows="3" formControlName="reportFooter"></textarea>
                </div>
              </div>
            </div>
          </div>

          <div class="col-lg-6">
            <div class="card">
              <div class="card-header"><h5 class="mb-0">Logos</h5></div>
              <div class="card-body">
                <div class="mb-3" *ngFor="let logo of logoFields">
                  <label class="form-label">{{ logo.label }}</label>
                  <input class="form-control" type="file" accept="image/*" (change)="loadLogo($event, logo.control)">
                  <img *ngIf="form.get(logo.control)?.value" [src]="form.get(logo.control)?.value" class="img-thumbnail mt-2" style="max-height: 90px;">
                  <button type="button" class="btn btn-sm btn-outline-danger mt-2" (click)="clearLogo(logo.control)" *ngIf="form.get(logo.control)?.value">
                    Quitar logo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button class="btn btn-primary mt-4" type="submit" [disabled]="form.invalid || saving">
          <i class="fas fa-save me-1"></i>
          {{ saving ? 'Guardando...' : 'Guardar Branding' }}
        </button>
      </form>
    </div>
  `
})
export class BrandingSettingsComponent implements OnInit {
  form: FormGroup;
  saving = false;
  successMessage = '';
  errorMessage = '';
  logoFields = [
    { label: 'Logo sidebar', control: 'sidebarLogo' },
    { label: 'Logo login', control: 'loginLogo' },
    { label: 'Logo reportes', control: 'reportLogo' }
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly settingsService: SettingsService
  ) {
    this.form = this.fb.group({
      appName: ['CertiVault', [Validators.required, Validators.maxLength(80)]],
      companyName: ['Netics', [Validators.required, Validators.maxLength(120)]],
      primaryColor: ['#0d6efd', Validators.required],
      secondaryColor: ['#6c757d', Validators.required],
      sidebarLogo: [''],
      loginLogo: [''],
      reportLogo: [''],
      reportFooter: ['Reporte generado por CertiVault', Validators.maxLength(250)]
    });
  }

  ngOnInit(): void {
    this.settingsService.getBranding().subscribe({
      next: (response) => this.form.patchValue(response.data || {}),
      error: (error) => this.errorMessage = error.message
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.settingsService.updateBranding(this.form.value as BrandingSettings).subscribe({
      next: (response) => {
        this.form.patchValue(response.data || {});
        this.successMessage = response.message || 'Branding actualizado';
        this.saving = false;
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.saving = false;
      }
    });
  }

  loadLogo(event: Event, controlName: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => this.form.get(controlName)?.setValue(reader.result as string);
    reader.readAsDataURL(file);
  }

  clearLogo(controlName: string): void {
    this.form.get(controlName)?.setValue('');
  }
}
