import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';
import { SettingsService } from './core/services/settings.service';

describe('App', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      // El componente raíz resuelve rutas y consulta el branding al inicializar, por lo que
      // necesita el router y el cliente HTTP simulados para poder instanciarse.
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('se instancia correctamente', () => {
    const fixture = TestBed.createComponent(App);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('solicita la configuración de branding al inicializar', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const request = httpMock.expectOne('/api/settings/branding');
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, data: { appName: 'CertVault QA', primaryColor: '#123456' } });
  });

  it('aplica el nombre y el color corporativo recibidos', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    httpMock.expectOne('/api/settings/branding').flush({
      success: true,
      data: { appName: 'CertVault QA', primaryColor: '#123456', sidebarLogo: '/logo.png' }
    });

    expect(fixture.componentInstance.appName).toBe('CertVault QA');
    expect(fixture.componentInstance.sidebarLogo).toBe('/logo.png');
    expect(document.documentElement.style.getPropertyValue('--primary-color')).toBe('#123456');
  });

  it('no interrumpe el arranque si el branding no está disponible', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    httpMock.expectOne('/api/settings/branding').flush(
      { success: false, error: 'No disponible' },
      { status: 500, statusText: 'Server Error' }
    );

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('conserva el branding aplicado en el servicio para el resto de las vistas', () => {
    const settingsService = TestBed.inject(SettingsService);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    httpMock.expectOne('/api/settings/branding').flush({
      success: true,
      data: { appName: 'CertVault QA', primaryColor: '#123456' }
    });

    settingsService.branding$.subscribe((branding) => {
      expect(branding?.appName).toBe('CertVault QA');
    });
  });
});
