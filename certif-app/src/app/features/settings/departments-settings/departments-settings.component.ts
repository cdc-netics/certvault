import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../../../core/services/user.service';
import { SettingsNavComponent } from '../settings-nav.component';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-departments-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SettingsNavComponent],
  templateUrl: './departments-settings.component.html',
  styleUrls: ['./departments-settings.component.css']
})
export class DepartmentsSettingsComponent implements OnInit, OnDestroy {
  departments: any[] = [];
  users: User[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  
  // Modal de creación y edición
  showModal = false;
  isEditMode = false;
  currentDeptId = '';
  deptForm: FormGroup;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly userService: UserService
  ) {
    this.deptForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      leaderId: [''],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData(): void {
    this.loadDepartments();
    this.loadUsers();
  }

  loadDepartments(): void {
    this.loading = true;
    this.userService.getDepartmentsList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.departments = response.data;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error cargando departamentos:', error);
          this.errorMessage = error.message || 'Error al obtener departamentos';
          this.loading = false;
        }
      });
  }

  private loadUsers(): void {
    this.userService.getUsers({ limit: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.users = response.data.users;
          }
        },
        error: (error) => {
          console.error('Error cargando usuarios:', error);
        }
      });
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.currentDeptId = '';
    this.deptForm.reset({
      name: '',
      leaderId: '',
      isActive: true
    });
    this.showModal = true;
  }

  openEditModal(dept: any): void {
    this.isEditMode = true;
    this.currentDeptId = dept._id;
    this.deptForm.patchValue({
      name: dept.name,
      leaderId: dept.leaderId?._id || dept.leaderId || '',
      isActive: dept.isActive
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.deptForm.reset();
  }

  onSubmit(): void {
    if (this.deptForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = this.deptForm.value;

    if (this.isEditMode) {
      this.userService.updateDepartment(this.currentDeptId, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.successMessage = 'Departamento actualizado exitosamente.';
              this.closeModal();
              this.loadDepartments();
              setTimeout(() => this.successMessage = '', 5000);
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error actualizando departamento:', error);
            this.errorMessage = error.message || 'Error al actualizar departamento';
            this.loading = false;
          }
        });
    } else {
      this.userService.createDepartment(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.successMessage = 'Departamento creado exitosamente.';
              this.closeModal();
              this.loadDepartments();
              setTimeout(() => this.successMessage = '', 5000);
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error creando departamento:', error);
            this.errorMessage = error.message || 'Error al crear departamento';
            this.loading = false;
          }
        });
    }
  }

  deleteDept(dept: any): void {
    if (!confirm(`¿Estás seguro de que deseas inactivar el departamento ${dept.name}?`)) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.userService.deleteDepartment(dept._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = 'Departamento inactivado correctamente.';
            this.loadDepartments();
            setTimeout(() => this.successMessage = '', 5000);
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al inactivar departamento:', error);
          this.errorMessage = error.message || 'No se pudo inactivar el departamento';
          this.loading = false;
        }
      });
  }

  getLeaderName(dept: any): string {
    if (!dept.leaderId) return 'Sin líder asignado';
    if (typeof dept.leaderId === 'object') {
      return `${dept.leaderId.firstName || ''} ${dept.leaderId.lastName || ''}`.trim() || dept.leaderId.username;
    }
    const userObj = this.users.find(u => u._id === dept.leaderId);
    return userObj ? `${userObj.firstName} ${userObj.lastName}` : 'ID: ' + dept.leaderId;
  }
}
