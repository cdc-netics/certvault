import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-terms-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="terms-overlay d-flex align-items-center justify-content-center">
      <div class="card shadow-lg terms-card border-0 rounded-3">
        <!-- Header con gradiente elegante -->
        <div class="card-header bg-dark text-white text-center py-4 rounded-top-3">
          <i class="fas fa-file-signature fa-3x text-warning mb-2"></i>
          <h4 class="mb-1 fw-bold">Acuerdo de Términos y Condiciones</h4>
          <p class="mb-0 text-muted small">Por favor lee detenidamente el siguiente acuerdo antes de continuar.</p>
        </div>

        <div class="card-body p-4">
          <!-- Contenedor del texto con scroll -->
          <div #scrollContainer 
               class="terms-text-container p-3 mb-4 border rounded bg-white" 
               (scroll)="onScroll($event)">
            
            <h5 class="fw-bold mb-3">TÉRMINOS Y CONDICIONES DE USO – CERTVAULT</h5>
            
            <p>Bienvenido a <strong>CertVault</strong>. Al utilizar esta plataforma, aceptas cumplir con los presentes Términos y Condiciones. Si no estás de acuerdo con alguno de los puntos, por favor abstente de utilizar el sistema.</p>

            <h6 class="fw-bold mt-4">1. Propósito de la Plataforma</h6>
            <p>CertVault es una herramienta interna diseñada exclusivamente para el registro, almacenamiento y gestión de certificaciones profesionales de los colaboradores. El objetivo principal es centralizar esta información para que las distintas áreas de la organización puedan identificar de manera rápida, ágil y eficiente las competencias y acreditaciones vigentes del equipo.</p>

            <h6 class="fw-bold mt-4">2. Uso Compartido de Datos dentro de la Empresa</h6>
            <p>Al ingresar tus certificaciones en CertVault, aceptas que esta información (nombre de la certificación, entidad emisora, fecha de expedición y vigencia) estará visible y se compartirá con las distintas jefaturas y áreas de la empresa que lo requieran para fines operativos, asignación de proyectos o auditorías.</p>

            <h6 class="fw-bold mt-4">3. Registro de Correo Electrónico Personal y Portabilidad</h6>
            <p>Para dar cumplimiento estricto a las normativas vigentes de protección de datos personales, el sistema requiere obligatoriamente el registro de un correo electrónico personal de contacto.</p>
            <p>Considerando que las certificaciones y logros profesionales son propiedad curricular exclusiva del individuo y no de la organización, CertVault garantiza el derecho de portabilidad de la siguiente manera:</p>
            <ul>
              <li>Inmediatamente después de que una cuenta sea dada de baja o eliminada del sistema (por cualquier motivo o término de relación contractual), la plataforma procesará la salida revocando los accesos corporativos.</li>
              <li>De forma automática, el sistema generará y enviará un respaldo completo con todas las certificaciones registradas directamente al correo electrónico personal configurado por el usuario.</li>
            </ul>

            <h6 class="fw-bold mt-4">4. Contingencia y Eliminación Absoluta de Datos</h6>
            <p>En caso de que ocurra un fallo técnico imprevisible, rebote de la dirección de correo proporcionada o cualquier evento que imposibilite la entrega efectiva del respaldo mencionado en la cláusula anterior, <strong>la empresa no retendrá bajo ninguna circunstancia la información del usuario</strong>.</p>
            <p>Ante la imposibilidad de entrega, CertVault procederá al borrado inmediato, definitivo e irreversible de todo el historial de certificaciones y datos personales asociados de los servidores de la compañía. La empresa no mantendrá copias de seguridad, registros históricos ni duplicados de dicha información curricular, garantizando que el antiguo colaborador mantenga el control total y exclusivo sobre sus datos una vez finalizado el vínculo.</p>

            <h6 class="fw-bold mt-4">5. Responsabilidad del Usuario</h6>
            <p>Como usuario de CertVault, te comprometes a:</p>
            <ul>
              <li>Entregar información verídica, exacta y vigente respecto a los certificados que adjuntes o registres.</li>
              <li>Mantener actualizado tu correo electrónico personal dentro de la configuración del perfil para asegurar la correcta recepción de tus datos en caso de una baja y evitar la activación de la cláusula de eliminación por fallo de entrega.</li>
              <li>Hacer un uso correcto de la plataforma, evitando la carga de archivos maliciosos o documentos ajenos al ámbito profesional.</li>
            </ul>

            <h6 class="fw-bold mt-4">6. Modificaciones del Servicio</h6>
            <p>La administración de la plataforma se reserva el derecho de actualizar la interfaz, añadir mejoras o realizar mantenimientos programados para garantizar la seguridad de los datos alojados. Cualquier cambio crítico en estas condiciones será notificado oportunamente a través de los canales internos.</p>
          </div>

          <!-- Alerta visual de lectura obligatoria -->
          <div *ngIf="!hasScrolledToBottom" class="alert alert-info border-0 rounded py-2 small d-flex align-items-center gap-2 mb-4">
            <i class="fas fa-arrow-down animate-bounce text-info"></i>
            <span>Por favor, desplázate hasta el final del documento para habilitar el botón de aceptación.</span>
          </div>

          <!-- Mensaje de error de red -->
          <div *ngIf="errorMessage" class="alert alert-danger border-0 rounded py-2 small mb-4">
            <i class="fas fa-exclamation-circle me-1"></i>
            {{ errorMessage }}
          </div>

          <!-- Botones de Acción -->
          <div class="d-flex justify-content-between align-items-center border-top pt-3">
            <button 
              type="button" 
              class="btn btn-outline-secondary px-3"
              (click)="onDecline()"
              [disabled]="loading">
              <i class="fas fa-sign-out-alt me-1"></i>
              Rechazar y Salir
            </button>
            <button 
              type="button" 
              class="btn btn-primary px-4 py-2 fw-bold d-flex align-items-center gap-2 shadow-sm"
              [disabled]="!hasScrolledToBottom || loading"
              (click)="onAccept()">
              <span *ngIf="loading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              <i *ngIf="!loading" class="fas fa-check-double"></i>
              {{ loading ? 'Procesando...' : 'Aceptar y Continuar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .terms-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(15, 23, 42, 0.75); /* Slate 900 con opacidad */
      backdrop-filter: blur(8px);
      z-index: 2500;
    }
    .terms-card {
      width: 90%;
      max-width: 650px;
      animation: zoomIn 0.3s ease-out;
    }
    .terms-text-container {
      height: 320px;
      overflow-y: auto;
      font-size: 0.9rem;
      line-height: 1.6;
      color: #334155; /* Slate 700 */
      border: 1px solid #e2e8f0 !important;
      scroll-behavior: smooth;
    }
    .animate-bounce {
      animation: bounce 1.5s infinite;
    }
    @keyframes zoomIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(4px); }
    }
  `]
})
export class TermsModalComponent implements OnInit {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  hasScrolledToBottom = false;
  loading = false;
  errorMessage = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    // Comprobar si el contenedor tiene scroll inicial o si es muy corto (por si acaso)
    setTimeout(() => {
      this.checkScrollHeight();
    }, 100);
  }

  // Detecta el desplazamiento del scroll dentro del cuadro de texto
  onScroll(event: Event): void {
    const target = event.target as HTMLElement;
    // Tolerancia de 10 píxeles para asegurar detección incluso con zoom
    const atBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 10;
    
    if (atBottom) {
      this.hasScrolledToBottom = true;
    }
  }

  // Si por alguna pantalla grande el texto cabe sin scroll, se habilita inmediatamente
  private checkScrollHeight(): void {
    if (this.scrollContainer) {
      const element = this.scrollContainer.nativeElement as HTMLElement;
      if (element.scrollHeight <= element.clientHeight) {
        this.hasScrolledToBottom = true;
      }
    }
  }

  // Lógica de aceptación
  onAccept(): void {
    if (!this.hasScrolledToBottom) return;

    this.loading = true;
    this.errorMessage = '';

    this.authService.acceptTerms()
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.router.navigate(['/dashboard']);
          } else {
            this.errorMessage = response.message || 'No se pudieron aceptar los términos. Intenta de nuevo.';
          }
        },
        error: (err) => {
          console.error('Error al aceptar términos y condiciones:', err);
          this.errorMessage = err.message || 'Error al conectar con el servidor. Intenta nuevamente.';
          this.loading = false;
        }
      });
  }

  // Si el usuario rechaza, se limpia su sesión y es redirigido al login
  onDecline(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
