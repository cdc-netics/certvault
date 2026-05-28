import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { TermsModalComponent } from './shared/components/terms-modal/terms-modal.component';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterModule, RouterOutlet, TermsModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('Netics-CertiVault - Sistema de Certificaciones');
  sidebarCollapsed = false;
  private routerSub?: Subscription;
  private readonly publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

  constructor(
    private readonly router: Router,
    public readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.setSidebarByRoute(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => this.setSidebarByRoute(event.urlAfterRedirects || event.url));
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
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
