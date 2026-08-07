import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrandingSettings, SettingsService } from '../../../core/services/settings.service';

@Component({
  selector: 'app-branding-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="alert alert-success" *ngIf="successMessage">{{ successMessage }}</div>
    <div class="alert alert-danger" *ngIf="errorMessage">{{ errorMessage }}</div>

    <form [formGroup]="form" (ngSubmit)="save()">
      <div class="row g-5">
        <!-- Sección de Identidad -->
        <div class="col-lg-6">
          <div class="mb-4">
            <h5 class="fw-bold text-dark mb-1">Identidad de la Plataforma</h5>
            <p class="text-muted small mb-0">Personaliza la información de la aplicación, empresa y colores temáticos corporativos.</p>
          </div>

          <div class="mt-4">
            <div class="mb-3">
              <label class="form-label fw-semibold text-secondary" for="appName">Nombre de la aplicación</label>
              <input id="appName" class="form-control" formControlName="appName" placeholder="CertiVault">
            </div>
            
            <div class="mb-3">
              <label class="form-label fw-semibold text-secondary" for="companyName">Empresa</label>
              <input id="companyName" class="form-control" formControlName="companyName" placeholder="Netics">
            </div>

            <div class="row mb-3">
              <div class="col-md-6 mb-3 mb-md-0">
                <label class="form-label fw-semibold text-secondary d-block" for="primaryColor">Color principal</label>
                <div class="d-flex align-items-center gap-2">
                  <input id="primaryColor" class="form-control form-control-color border-2" type="color" formControlName="primaryColor" style="width: 50px; height: 38px; padding: 3px;">
                  <span class="font-monospace text-secondary small">{{ form.get('primaryColor')?.value }}</span>
                </div>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-semibold text-secondary d-block" for="secondaryColor">Color secundario</label>
                <div class="d-flex align-items-center gap-2">
                  <input id="secondaryColor" class="form-control form-control-color border-2" type="color" formControlName="secondaryColor" style="width: 50px; height: 38px; padding: 3px;">
                  <span class="font-monospace text-secondary small">{{ form.get('secondaryColor')?.value }}</span>
                </div>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold text-secondary" for="reportFooter">Pie de página en reportes</label>
              <textarea id="reportFooter" class="form-control" rows="3" formControlName="reportFooter" placeholder="Escribe el texto legal o institucional para el pie de reportes..."></textarea>
            </div>
          </div>
        </div>

        <!-- Sección de Logos -->
        <div class="col-lg-6">
          <div class="mb-4">
            <h5 class="fw-bold text-dark mb-1">Logotipos e Imágenes</h5>
            <p class="text-muted small mb-0">Carga los logos institucionales para los diferentes módulos de la aplicación.</p>
          </div>

          <div class="mt-4">
            <div class="mb-4 pb-3 border-bottom border-light" *ngFor="let logo of logoFields">
              <label class="form-label fw-semibold text-secondary mb-1">{{ logo.label }}</label>
              <input class="form-control form-control-sm mb-2" type="file" accept="image/*" (change)="loadLogo($event, logo.control)">
              
              <div class="d-flex align-items-center gap-3 mt-2" *ngIf="form.get(logo.control)?.value">
                <div class="p-2 bg-light border rounded-2 d-flex align-items-center justify-content-center">
                  <img [src]="form.get(logo.control)?.value" class="img-fluid" style="max-height: 50px; object-fit: contain;">
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger px-2 py-1" (click)="clearLogo(logo.control)">
                  <i class="fas fa-trash-alt me-1"></i> Quitar logo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-5 pt-3 border-top d-flex justify-content-end">
        <button class="btn btn-primary px-4 py-2 fw-semibold" type="submit" [disabled]="form.invalid || saving">
          <i class="fas fa-save me-1"></i>
          {{ saving ? 'Guardando...' : 'Guardar Branding' }}
        </button>
      </div>
    </form>
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
        if (response.data) {
          // Aplicar inmediatamente los cambios visuales en el DOM
          this.settingsService.applyBranding(response.data);
        }
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
