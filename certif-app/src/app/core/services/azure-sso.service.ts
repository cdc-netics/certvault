import { Injectable } from '@angular/core';
import {
  AuthenticationResult,
  BrowserAuthError,
  Configuration,
  PublicClientApplication
} from '@azure/msal-browser';

export interface AzureSsoConfig {
  tenantId: string;
  clientId: string;
}

/** El usuario cerró la ventana de Microsoft: no es un fallo que deba reportarse como error. */
export class AzureSsoCancelledError extends Error {
  constructor() {
    super('El inicio de sesión con Microsoft fue cancelado.');
    this.name = 'AzureSsoCancelledError';
  }
}

/**
 * Obtiene un id_token real de Microsoft Entra ID mediante Authorization Code + PKCE.
 *
 * Se instancia MSAL de forma diferida y no vía `@azure/msal-angular` porque el Tenant y el
 * Client ID son configuración de base de datos que llega por `/ad-config` en tiempo de
 * ejecución, mientras que el módulo de Angular exige conocerlos durante el bootstrap.
 *
 * El token resultante viaja al backend, que verifica su firma contra el JWKS del tenant: el
 * navegador nunca es la autoridad sobre la identidad del usuario, solo el canal que
 * transporta la credencial emitida por Microsoft.
 */
@Injectable({ providedIn: 'root' })
export class AzureSsoService {
  private instance?: PublicClientApplication;
  private instanceKey = '';

  async acquireIdToken(config: AzureSsoConfig): Promise<string> {
    const instance = await this.resolveInstance(config);

    try {
      const result: AuthenticationResult = await instance.loginPopup({
        scopes: ['openid', 'profile', 'email'],
        // Evita reutilizar en silencio una sesión previa del navegador con otra cuenta.
        prompt: 'select_account'
      });

      if (!result.idToken) {
        throw new Error('Microsoft no devolvió un token de identidad.');
      }

      return result.idToken;
    } catch (error) {
      if (error instanceof BrowserAuthError && error.errorCode === 'user_cancelled') {
        throw new AzureSsoCancelledError();
      }
      throw error;
    }
  }

  /** Reutiliza la instancia salvo que cambie la configuración del tenant en el panel de seguridad. */
  private async resolveInstance(config: AzureSsoConfig): Promise<PublicClientApplication> {
    const key = `${config.tenantId}:${config.clientId}`;
    if (this.instance && this.instanceKey === key) {
      return this.instance;
    }

    const msalConfig: Configuration = {
      auth: {
        clientId: config.clientId,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
        // Debe coincidir con un Redirect URI de tipo SPA en el App Registration de Entra ID.
        redirectUri: window.location.origin
      },
      cache: {
        // La sesión de MSAL no debe sobrevivir al cierre de la pestaña: la sesión real de
        // CertVault la gobierna el token que emite el backend tras verificar el id_token.
        cacheLocation: 'sessionStorage'
      }
    };

    const instance = new PublicClientApplication(msalConfig);
    await instance.initialize();

    this.instance = instance;
    this.instanceKey = key;
    return instance;
  }
}
