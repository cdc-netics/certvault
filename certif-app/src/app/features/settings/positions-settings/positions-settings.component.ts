import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../../../core/services/user.service';
import { Position } from '../../../core/models/user.model';

@Component({
  selector: 'app-positions-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './positions-settings.component.html',
  styleUrls: ['./positions-settings.component.css']
})
export class PositionsSettingsComponent implements OnInit, OnDestroy {
  positions: Position[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';

  // Formulario y estado del modal
  showModal = false;
  isEditMode = false;
  currentPositionId = '';
  positionForm: FormGroup;

  // Filtros
  showActiveOnly = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly userService: UserService
  ) {
    // Formulario reactivo para la creación y edición de cargos
    this.positionForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadPositions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Carga el listado de cargos desde el backend
  loadPositions(): void {
    this.loading = true;
    this.errorMessage = '';
    this.userService.getPositions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.positions = response.data;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error cargando cargos:', error);
          this.errorMessage = error.message || 'Error al obtener cargos';
          this.loading = false;
        }
      });
  }

  // Abre el modal para crear un nuevo cargo
  openCreateModal(): void {
    this.isEditMode = false;
    this.currentPositionId = '';
    this.positionForm.reset({
      name: '',
      isActive: true
    });
    this.showModal = true;
  }

  // Abre el modal para editar un cargo existente
  openEditModal(pos: Position): void {
    this.isEditMode = true;
    this.currentPositionId = pos._id || '';
    this.positionForm.patchValue({
      name: pos.name,
      isActive: pos.isActive
    });
    this.showModal = true;
  }

  // Cierra el modal y limpia el formulario
  closeModal(): void {
    this.showModal = false;
    this.positionForm.reset();
  }

  // Maneja el envío del formulario para crear o actualizar un cargo
  onSubmit(): void {
    if (this.positionForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = this.positionForm.value;

    if (this.isEditMode) {
      this.userService.updatePosition(this.currentPositionId, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.successMessage = 'Cargo actualizado exitosamente.';
              this.closeModal();
              this.loadPositions();
              setTimeout(() => this.successMessage = '', 5000);
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error actualizando cargo:', error);
            this.errorMessage = error.message || 'Error al actualizar cargo';
            this.loading = false;
          }
        });
    } else {
      this.userService.createPosition(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.successMessage = 'Cargo creado exitosamente.';
              this.closeModal();
              this.loadPositions();
              setTimeout(() => this.successMessage = '', 5000);
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error creando cargo:', error);
            this.errorMessage = error.message || 'Error al crear cargo';
            this.loading = false;
          }
        });
    }
  }

  // Alterna el estado activo/inactivo de un cargo
  togglePositionActive(pos: Position): void {
    const nextStatus = !pos.isActive;
    const actionWord = nextStatus ? 'activar' : 'inactivar';
    if (!confirm(`¿Estás seguro de que deseas ${actionWord} el cargo "${pos.name}"?`)) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.userService.updatePosition(pos._id!, { name: pos.name, isActive: nextStatus })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = `Cargo ${nextStatus ? 'activado' : 'inactivado'} exitosamente.`;
            this.loadPositions();
            setTimeout(() => this.successMessage = '', 5000);
          }
          this.loading = false;
        },
        error: (error) => {
          console.error(`Error al ${actionWord} el cargo:`, error);
          this.errorMessage = error.message || `No se pudo ${actionWord} el cargo`;
          this.loading = false;
        }
      });
  }

  // Elimina físicamente un cargo del sistema
  deletePosition(pos: Position): void {
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el cargo "${pos.name}"? Esta acción desvinculará el cargo de todos los colaboradores asignados.`)) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.userService.deletePosition(pos._id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = 'Cargo eliminado permanentemente del sistema.';
            this.loadPositions();
            setTimeout(() => this.successMessage = '', 5000);
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al eliminar cargo:', error);
          this.errorMessage = error.message || 'No se pudo eliminar el cargo';
          this.loading = false;
        }
      });
  }

  // Filtra los cargos basados en el estado showActiveOnly
  getFilteredPositions(): Position[] {
    if (this.showActiveOnly) {
      return this.positions.filter(pos => pos.isActive);
    }
    return this.positions;
  }
}
