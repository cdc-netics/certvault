import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter, Subscription, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { SettingsService } from './core/services/settings.service';
import { TermsModalComponent } from './shared/components/terms-modal/terms-modal.component';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterModule, RouterOutlet, TermsModalComponent, ToastContainerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('Netics-CertiVault - Sistema de Certificaciones');
  sidebarCollapsed = false;
  private routerSub?: Subscription;
  private readonly publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
  
  appName = '';
  sidebarLogo = '';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly router: Router,
    public readonly authService: AuthService,
    private readonly settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    this.setSidebarByRoute(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => this.setSidebarByRoute(event.urlAfterRedirects || event.url));

    // Suscribirse a los cambios del branding dinámico
    this.settingsService.branding$
      .pipe(takeUntil(this.destroy$))
      .subscribe((branding) => {
        if (branding) {
          this.appName = branding.appName || 'CertiVault';
          this.sidebarLogo = branding.sidebarLogo || '';
        }
      });

    // Cargar y aplicar configuración inicial de branding
    this.settingsService.loadAndApplyBranding().subscribe({
      error: (err) => console.error('Error al cargar la configuración de branding:', err)
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  canSeeUsers(): boolean {
    return this.authService.canViewUsers();
  }

  isLoginPage(): boolean {
    const current = this.router.url;
    return this.publicRoutes.some(route => current.startsWith(route));
  }

  // Comprueba si se debe desplegar el modal de términos y condiciones de uso
  get showTermsModal(): boolean {
    if (this.isLoginPage()) return false;
    
    const user = this.authService.getCurrentUser();
    if (!user || !this.authService.isLoggedIn()) return false;
    
    // No mostrar el modal de terminos si el usuario esta obligado a cambiar su contrasena en este momento para evitar conflictos visuales en la interfaz
    if (user.mustChangePassword) return false;
    
    // Se muestra si el usuario no ha aceptado los terminos o si el disparador fue activado explicitamente
    return !user.termsAccepted || this.authService.isTermsModalTriggered();
  }

  private setSidebarByRoute(url: string): void {
    this.sidebarCollapsed = !url.startsWith('/dashboard');
  }
}
