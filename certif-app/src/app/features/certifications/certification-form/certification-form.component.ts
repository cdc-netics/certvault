import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CertificationService } from '../../../core/services/certification.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { CertificationType, CertificationLevel, CertificationStatus, Certification } from '../../../core/models/certification.model';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';

@Component({
  selector: 'app-certification-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, BackButtonComponent],
  template: `
    <div class="container-fluid">
      <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 class="h2">{{ isEditMode ? 'Editar Certificacion' : 'Nueva Certificacion' }}</h1>
        <div class="btn-toolbar mb-2 mb-md-0">
          <app-back-button [customRoute]="'/certifications'"></app-back-button>
        </div>
      </div>

      <div class="row justify-content-center">
        <div class="col-lg-8">
          <div class="card">
            <div class="card-body">
              <form [formGroup]="certificationForm" (ngSubmit)="onSubmit()" enctype="multipart/form-data">

                <!-- Informacion Basica -->
                <div class="mb-4">
                  <h5 class="card-title mb-3">Informacion Basica</h5>

                  <div class="row">
                    <!-- Certificacion -->
                    <div class="col-md-6 mb-3">
                      <label for="title" class="form-label">Certificacion *</label>
                      <input
                        type="text"
                        id="title"
                        name="certificacion"
                        class="form-control"
                        [class.is-invalid]="certificationForm.get('title')?.invalid && certificationForm.get('title')?.touched"
                        formControlName="title"
                        placeholder="Nombre de la certificacion"
                      >
                      <div class="invalid-feedback" *ngIf="certificationForm.get('title')?.invalid && certificationForm.get('title')?.touched">
                        <small *ngIf="certificationForm.get('title')?.errors?.['required']">La certificacion es requerida</small>
                      </div>
                    </div>

                    <!-- Tipo -->
                    <div class="col-md-6 mb-3">
                      <label for="type" class="form-label">Tipo *</label>
                      <select
                        id="type"
                        class="form-control"
                        [class.is-invalid]="certificationForm.get('type')?.invalid && certificationForm.get('type')?.touched"
                        formControlName="type"
                      >
                        <option value="">Seleccionar tipo</option>
                        <option value="technical">Tecnica</option>
                        <option value="professional">Profesional</option>
                        <option value="security">Seguridad</option>
                        <option value="cloud">Cloud</option>
                        <option value="management">Gestion</option>
                        <option value="soft_skills">Habilidades Blandas</option>
                        <option value="compliance">Cumplimiento</option>
                        <option value="other">Otro</option>
                      </select>
                      <div class="invalid-feedback" *ngIf="certificationForm.get('type')?.invalid && certificationForm.get('type')?.touched">
                        <small *ngIf="certificationForm.get('type')?.errors?.['required']">El tipo es requerido</small>
                      </div>
                    </div>
                  </div>

                  <div class="row">
                    <!-- Dificultad/Nivel -->
                    <div class="col-md-6 mb-3">
                      <label for="level" class="form-label">Nivel *</label>
                      <select
                        id="level"
                        name="dificultad"
                        class="form-control"
                        [class.is-invalid]="certificationForm.get('level')?.invalid && certificationForm.get('level')?.touched"
                        formControlName="level"
                      >
                        <option value="">Seleccionar nivel</option>
                        <option value="beginner">Principiante</option>
                        <option value="intermediate">Intermedio</option>
                        <option value="advanced">Avanzado</option>
                        <option value="expert">Experto</option>
                        <option value="academic">Académico</option>
                      </select>
                      <div class="invalid-feedback" *ngIf="certificationForm.get('level')?.invalid && certificationForm.get('level')?.touched">
                        <small *ngIf="certificationForm.get('level')?.errors?.['required']">El nivel es requerido</small>
                      </div>
                    </div>

                    <!-- Plataforma/Proveedor -->
                    <div class="col-md-6 mb-3">
                      <label for="provider" class="form-label">Plataforma/Emisor *</label>
                      <input
                        type="text"
                        id="provider"
                        name="plataforma"
                        class="form-control"
                        [class.is-invalid]="certificationForm.get('provider')?.invalid && certificationForm.get('provider')?.touched"
                        formControlName="provider"
                        placeholder="Ej: AWS, Microsoft, Google"
                      >
                      <div class="invalid-feedback" *ngIf="certificationForm.get('provider')?.invalid && certificationForm.get('provider')?.touched">
                        <small *ngIf="certificationForm.get('provider')?.errors?.['required']">El proveedor es requerido</small>
                      </div>
                    </div>
                  </div>

                  <div class="row">
                    <!-- ID/Numero de Certificado -->
                    <div class="col-md-6 mb-3">
                      <label for="certificateNumber" class="form-label">ID/Numero de Certificado</label>
                      <input
                        type="text"
                        id="certificateNumber"
                        name="id"
                        class="form-control"
                        formControlName="certificateNumber"
                        placeholder="ID del certificado (opcional)"
                      >
                    </div>

                    <!-- Tecnologia -->
                    <div class="col-md-6 mb-3">
                      <label for="technology" class="form-label">Tecnologia/Concepto *</label>
                      <input
                        type="text"
                        id="technology"
                        name="tecnologia"
                        class="form-control"
                        [class.is-invalid]="certificationForm.get('technology')?.invalid && certificationForm.get('technology')?.touched"
                        formControlName="technology"
                        placeholder="Ej: React, Python, Project Management"
                      >
                      <div class="invalid-feedback" *ngIf="certificationForm.get('technology')?.invalid && certificationForm.get('technology')?.touched">
                        <small *ngIf="certificationForm.get('technology')?.errors?.['required']">La tecnologia es requerida</small>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Configuracion Organizacional (Solo para Admin o Lider) -->
                <div class="mb-4" *ngIf="isUserAdminOrLeader">
                  <h5 class="card-title mb-3">Configuracion de Alcance Organizacional</h5>
                  <div class="row">
                    <div class="col-md-12 mb-3">
                      <div class="form-check form-switch">
                        <input 
                          type="checkbox" 
                          id="isOrganizational" 
                          class="form-check-input" 
                          formControlName="isOrganizational"
                        >
                        <label class="form-check-label" for="isOrganizational">
                          ¿Es una certificacion organizacional o de compliance? (Aplica a areas o a toda la empresa)
                        </label>
                      </div>
                    </div>
                  </div>

                  <div class="row" *ngIf="certificationForm.get('isOrganizational')?.value">
                    <div class="col-md-12 mb-3">
                      <div class="form-check form-switch mb-3">
                        <input 
                          type="checkbox" 
                          id="appliesToAllCompany" 
                          class="form-check-input" 
                          formControlName="appliesToAllCompany"
                        >
                        <label class="form-check-label" for="appliesToAllCompany">
                          Aplica a toda la empresa por igual
                        </label>
                      </div>
                    </div>

                    <!-- Seleccion de Departamentos -->
                    <div class="col-md-12 mb-3" *ngIf="!certificationForm.get('appliesToAllCompany')?.value">
                      <label class="form-label d-block fw-bold">Seleccionar Areas/Departamentos Aplicables *</label>
                      <div class="row px-3">
                        <div class="col-md-4 mb-2" *ngFor="let dept of departmentsList">
                          <div class="form-check">
                            <input 
                              type="checkbox" 
                              [id]="'dept-' + dept._id" 
                              class="form-check-input" 
                              [checked]="isDepartmentChecked(dept._id)"
                              (change)="onDepartmentCheckChange(dept._id, $event)"
                            >
                            <label class="form-check-label text-muted" [for]="'dept-' + dept._id">
                              {{ dept.name }}
                            </label>
                          </div>
                        </div>
                      </div>
                      <div class="text-danger mt-1" *ngIf="(certificationForm.get('applicableDepartments')?.value || []).length === 0">
                        <small>Debe seleccionar al menos un departamento aplicable.</small>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Fechas -->
                <div class="mb-4">
                  <h5 class="card-title mb-3">Fechas</h5>

                  <div class="row">
                    <!-- Fecha de Emision -->
                    <div class="col-md-6 mb-3">
                      <label for="issueDate" class="form-label">Fecha de Emision *</label>
                      <input
                        type="date"
                        id="issueDate"
                        name="fecha"
                        class="form-control"
                        [class.is-invalid]="certificationForm.get('issueDate')?.invalid && certificationForm.get('issueDate')?.touched"
                        formControlName="issueDate"
                      >
                      <div class="invalid-feedback" *ngIf="certificationForm.get('issueDate')?.invalid && certificationForm.get('issueDate')?.touched">
                        <small *ngIf="certificationForm.get('issueDate')?.errors?.['required']">La fecha de emision es requerida</small>
                      </div>
                    </div>

                    <!-- Fecha de Caducidad -->
                    <div class="col-md-6 mb-3">
                      <label for="expirationDate" class="form-label">Fecha de Caducidad</label>
                      <input
                        type="date"
                        id="expirationDate"
                        name="caducidad"
                        class="form-control"
                        formControlName="expirationDate"
                        placeholder="Fecha de caducidad (opcional)"
                      >
                    </div>
                  </div>
                </div>

                <!-- Informacion Adicional -->
                <div class="mb-4">
                  <h5 class="card-title mb-3">Informacion Adicional</h5>

                  <div class="row">
                    <!-- Tags -->
                    <div class="col-md-6 mb-3">
                      <label for="tags" class="form-label">Tags</label>
                      <input
                        type="text"
                        id="tags"
                        name="tags"
                        class="form-control"
                        formControlName="tagsInput"
                        placeholder="Tags separados por comas"
                      >
                      <small class="form-text text-muted">Separar multiples tags con comas</small>
                    </div>

                    <!-- Badge -->
                    <div class="col-md-6 mb-3">
                      <label for="hasBadge" class="form-label">Tiene Badge?</label>
                      <select
                        id="hasBadge"
                        name="badge"
                        class="form-control"
                        formControlName="hasBadge"
                      >
                        <option value="true">Si</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                  </div>

                  <div class="row">
                    <!-- Link -->
                    <div class="col-md-12 mb-3">
                      <label for="validationUrl" class="form-label">Link de Validacion</label>
                      <input
                        type="url"
                        id="validationUrl"
                        name="link"
                        class="form-control"
                        formControlName="validationUrl"
                        placeholder="Link de badge Credly o validacion (opcional)"
                      >
                    </div>
                  </div>

                  <!-- Descripcion -->
                  <div class="mb-3">
                    <label for="description" class="form-label">Descripcion</label>
                    <textarea
                      id="description"
                      class="form-control"
                      formControlName="description"
                      rows="3"
                      placeholder="Descripcion de la certificacion"
                    ></textarea>
                  </div>

                  <!-- Archivo -->
                  <div class="mb-3">
                    <label for="certificateFile" class="form-label">Archivo del Certificado</label>
                    <input
                      type="file"
                      id="certificateFile"
                      name="archivo"
                      class="form-control"
                      (change)="onFileSelected($event)"
                      accept=".pdf,.jpg,.jpeg,.png"
                    >
                    <div class="mt-2" *ngIf="existingCertificateUrl">
                      <small class="form-text text-muted d-block">Archivo actual: {{ existingCertificateName || 'certificado' }}</small>
                      <button class="btn btn-link btn-sm ps-0" type="button" (click)="openExistingCertificate()">
                        <i class="fas fa-eye me-1"></i> Ver certificado actual
                      </button>
                    </div>
                    <small class="form-text text-muted">Formatos permitidos: PDF, JPG, PNG (max. 5MB)</small>
                  </div>
                </div>

                <!-- Error Message -->
                <div class="alert alert-danger" *ngIf="errorMessage">
                  <small>{{ errorMessage }}</small>
                </div>

                <!-- Success Message -->
                <div class="alert alert-success" *ngIf="successMessage">
                  <small>{{ successMessage }}</small>
                </div>

                <!-- Submit Buttons -->
                <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                  <button
                    type="button"
                    class="btn btn-outline-secondary me-md-2"
                    routerLink="/certifications"
                    [disabled]="isLoading"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    class="btn btn-primary"
                    [disabled]="certificationForm.invalid || isLoading"
                    style="grid-column: 1 / span 3"
                  >
                    <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                    {{ isLoading ? 'Guardando...' : (isEditMode ? 'Actualizar' : 'Guardar') }}
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      border: none;
      box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
    }

    .form-control:focus {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 0.2rem rgba(37, 99, 235, 0.25);
    }

    .card-title {
      color: var(--primary-color);
      border-bottom: 1px solid #e9ecef;
      padding-bottom: 0.5rem;
    }
  `]
})
export class CertificationFormComponent implements OnInit {
  certificationForm: FormGroup;
  isLoading = false;
  isEditMode = false;
  errorMessage = '';
  successMessage = '';
  selectedFile: File | null = null;
  certificationId: string | null = null;
  currentUser: any;
  existingCertificateUrl: string | null = null;
  existingCertificateName: string | null = null;
  private originalCertification: Certification | null = null;
  
  // Lista de departamentos para certificaciones organizacionales
  departmentsList: any[] = [];
  // Bandera para saber si el usuario actual es admin o líder
  isUserAdminOrLeader = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly certificationService: CertificationService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    this.certificationForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      type: ['', Validators.required],
      technology: ['', Validators.required],
      provider: ['', Validators.required],
      level: ['', Validators.required],
      issueDate: ['', Validators.required],
      expirationDate: [''],
      certificateNumber: [''],
      validationUrl: [''],
      tagsInput: [''],
      hasBadge: ['false'],
      isOrganizational: [false],
      appliesToAllCompany: [false],
      applicableDepartments: [[]]
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isUserAdminOrLeader = this.currentUser?.role === 'admin' || this.currentUser?.role === 'lider';

    if (this.isUserAdminOrLeader) {
      this.loadDepartments();
    }

    // Verificar si es modo edicion
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.certificationId = params['id'];
        this.loadCertification(params['id']);
      }
    });
  }

  // Cargar departamentos activos para la configuración organizacional
  loadDepartments(): void {
    this.userService.getDepartmentsList(true).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.departmentsList = response.data;
        }
      },
      error: () => {
        console.error('Error al cargar departamentos');
      }
    });
  }

  // Manejar cambios en la selección de departamentos
  onDepartmentCheckChange(deptId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentDepts: string[] = this.certificationForm.get('applicableDepartments')?.value || [];
    if (checked) {
      this.certificationForm.patchValue({
        applicableDepartments: [...currentDepts, deptId]
      });
    } else {
      this.certificationForm.patchValue({
        applicableDepartments: currentDepts.filter(id => id !== deptId)
      });
    }
  }

  // Verificar si un departamento específico está seleccionado
  isDepartmentChecked(deptId: string): boolean {
    const currentDepts: string[] = this.certificationForm.get('applicableDepartments')?.value || [];
    return currentDepts.includes(deptId);
  }

  loadCertification(id: string): void {
    this.isLoading = true;
    this.certificationService.getCertificationById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const cert = response.data;
          this.originalCertification = cert;
          this.existingCertificateUrl = cert.certificateUrl || null;
          this.existingCertificateName = cert.certificateUrl
            ? cert.certificateUrl.split('/').pop() || null
            : null;
          this.certificationForm.patchValue({
            title: cert.title,
            description: cert.description,
            type: cert.type,
            technology: cert.technology,
            provider: cert.provider,
            level: cert.level,
            issueDate: new Date(cert.issueDate).toISOString().split('T')[0],
            expirationDate: cert.expirationDate ? new Date(cert.expirationDate).toISOString().split('T')[0] : '',
            certificateNumber: cert.certificateNumber,
            validationUrl: cert.validationUrl,
            tagsInput: cert.tags?.join(', ') || '',
            hasBadge: cert.validationUrl ? 'true' : 'false',
            isOrganizational: cert.isOrganizational || false,
            appliesToAllCompany: cert.appliesToAllCompany || false,
            applicableDepartments: cert.applicableDepartments ? cert.applicableDepartments.map((d: any) => typeof d === 'object' ? d._id : d) : []
          });
        }
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Error al cargar la certificacion';
        this.isLoading = false;
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validar tamano (5MB maximo)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'El archivo no puede superar los 5MB';
        return;
      }

      // Validar tipo
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        this.errorMessage = 'Formato de archivo no valido. Use PDF, JPG o PNG';
        return;
      }

      this.selectedFile = file;
      this.errorMessage = '';
    }
  }

  onSubmit(): void {
    if (this.certificationForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const formValue = this.certificationForm.value;
      const isOrg = this.isUserAdminOrLeader && formValue.isOrganizational;
      const appliesToAll = formValue.appliesToAllCompany;
      const depts = formValue.applicableDepartments || [];

      // Validar que se seleccione al menos un departamento si es organizacional y no global
      if (isOrg && !appliesToAll && depts.length === 0) {
        this.errorMessage = 'Debe seleccionar al menos un departamento aplicable para certificaciones organizacionales.';
        this.isLoading = false;
        return;
      }

      // Si es organizacional, los datos del empleado individual no son aplicables
      const employeeIdValue = isOrg
        ? null
        : (this.isEditMode && this.originalCertification
          ? (this.originalCertification as any).employeeId || this.originalCertification.employeeId
          : this.currentUser._id);

      const employeeNameValue = isOrg
        ? null
        : (this.isEditMode && this.originalCertification
          ? (this.originalCertification as any).employeeName || this.originalCertification.employeeName || ''
          : `${this.currentUser.firstName} ${this.currentUser.lastName}`);

      const departmentValue = isOrg
        ? null
        : (this.isEditMode && this.originalCertification
          ? this.originalCertification.department
          : this.currentUser.department);

      const certificateNumberValue = (formValue.certificateNumber || '').trim();
      const validationUrlValue = (formValue.validationUrl || '').trim();
      const expirationDateValue = formValue.expirationDate ? new Date(formValue.expirationDate) : null;

      const processedCurrent: any = {
        title: formValue.title,
        description: formValue.description || '',
        type: formValue.type as CertificationType,
        technology: formValue.technology,
        provider: formValue.provider,
        level: formValue.level as CertificationLevel,
        employeeId: employeeIdValue,
        employeeName: employeeNameValue,
        department: departmentValue,
        issueDate: formValue.issueDate ? new Date(formValue.issueDate) : undefined,
        expirationDate: expirationDateValue,
        certificateNumber: certificateNumberValue ? certificateNumberValue : null,
        validationUrl: validationUrlValue ? validationUrlValue : null,
        tags: formValue.tagsInput ? formValue.tagsInput.split(',').map((tag: string) => tag.trim()) : [],
        status: CertificationStatus.ACTIVE,
        // Propiedades organizacionales
        isOrganizational: isOrg,
        appliesToAllCompany: isOrg ? appliesToAll : false,
        applicableDepartments: (isOrg && !appliesToAll) ? depts : []
      };

      const buildDiffPayload = (): Partial<Certification> => {
        if (!this.originalCertification) {
          return processedCurrent as Partial<Certification>;
        }

        const orig = {
          title: this.originalCertification.title,
          description: this.originalCertification.description || '',
          type: this.originalCertification.type,
          technology: this.originalCertification.technology,
          provider: this.originalCertification.provider,
          level: this.originalCertification.level,
          employeeId: (this.originalCertification as any).employeeId || this.originalCertification.employeeId,
          employeeName: (this.originalCertification as any).employeeName || this.originalCertification.employeeName || '',
          department: this.originalCertification.department,
          issueDate: this.originalCertification.issueDate ? new Date(this.originalCertification.issueDate) : undefined,
          expirationDate: this.originalCertification.expirationDate ? new Date(this.originalCertification.expirationDate) : undefined,
          certificateNumber: this.originalCertification.certificateNumber,
          validationUrl: this.originalCertification.validationUrl || null,
          tags: this.originalCertification.tags || [],
          status: this.originalCertification.status || CertificationStatus.ACTIVE,
          isOrganizational: this.originalCertification.isOrganizational || false,
          appliesToAllCompany: this.originalCertification.appliesToAllCompany || false,
          applicableDepartments: this.originalCertification.applicableDepartments ? this.originalCertification.applicableDepartments.map((d: any) => typeof d === 'object' ? d._id : d) : []
        };

        const diff: Partial<Certification> = {};
        (Object.keys(processedCurrent) as Array<keyof typeof processedCurrent>).forEach((key) => {
          const currentValue = processedCurrent[key];
          const originalValue = (orig as any)[key];

          const areDates = key === 'issueDate' || key === 'expirationDate';
          const isArray = Array.isArray(currentValue) || Array.isArray(originalValue);

          const normalizeDate = (value: any) => value ? new Date(value).toISOString() : '';

          const changed = isArray
            ? JSON.stringify(currentValue || []) !== JSON.stringify(originalValue || [])
            : areDates
              ? normalizeDate(currentValue) !== normalizeDate(originalValue)
              : currentValue !== originalValue;

          if (changed && currentValue !== undefined) {
            (diff as any)[key] = currentValue;
          }
        });

        return diff as Partial<Certification>;
      };

      const payload = this.isEditMode ? buildDiffPayload() : {
        ...(processedCurrent as any),
        certificateNumber: processedCurrent.certificateNumber || `CERT-${Date.now()}`
      } as Partial<Certification>;

      const operation = this.isEditMode && this.certificationId
        ? this.certificationService.updateCertification(this.certificationId, payload)
        : this.certificationService.createCertification(payload);

      operation.subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = this.isEditMode
              ? 'Certificacion actualizada exitosamente'
              : 'Certificacion creada exitosamente';

            // Si hay archivo, subirlo
            if (this.selectedFile && response.data?._id) {
              this.uploadFile(response.data._id);
            } else {
              // Redireccionar despues de un momento
              setTimeout(() => {
                this.router.navigate(['/certifications']);
              }, 2000);
            }
          }
        },
        error: (error) => {
          this.errorMessage = error.message || 'Error al guardar la certificacion';
          this.isLoading = false;
        }
      });
    } else {
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(this.certificationForm.controls).forEach(key => {
        this.certificationForm.get(key)?.markAsTouched();
      });
    }
  }

  private uploadFile(certificationId: string): void {
    if (this.selectedFile) {
      this.certificationService.uploadCertificateFile(certificationId, this.selectedFile).subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage += ' y archivo subido correctamente';
          }
          this.isLoading = false;
          // Redireccionar despues de un momento
          setTimeout(() => {
            this.router.navigate(['/certifications']);
          }, 2000);
        },
        error: () => {
          this.errorMessage = 'Certificacion guardada pero error al subir archivo';
          this.isLoading = false;
        }
      });
    }
  }

  getCertificateUrl(url: string): string {
    const rawUrl = url.trim();
    if (rawUrl.startsWith('/uploads/')) return rawUrl;

    if (rawUrl.startsWith('http')) {
      try {
        const parsed = new URL(rawUrl);
        if (parsed.pathname.startsWith('/uploads/')) {
          return `${parsed.pathname}${parsed.search}${parsed.hash}`;
        }
      } catch {
        return rawUrl;
      }
      return rawUrl;
    }

    return rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  }

  openExistingCertificate(): void {
    if (!this.certificationId || !this.existingCertificateUrl) return;

    if (!this.isInternalCertificateUrl(this.existingCertificateUrl)) {
      const url = this.getCertificateUrl(this.existingCertificateUrl);
      if (url.startsWith('https://')) {
        window.open(url, '_blank', 'noopener');
        return;
      }
      this.errorMessage = 'El enlace externo no es seguro. Debe usar HTTPS.';
      return;
    }

    this.certificationService.getCertificationFile(this.certificationId).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      },
      error: () => {
        this.errorMessage = 'No se pudo abrir el certificado';
      }
    });
  }

  private isInternalCertificateUrl(url: string): boolean {
    return this.getCertificateUrl(url).startsWith('/uploads/certificates/');
  }
}
