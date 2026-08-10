import { Injectable } from '@angular/core';
import {
  PublicClientApplication,
  AuthenticationResult,
  Configuration,
  PopupRequest,
  BrowserCacheLocation
} from '@azure/msal-browser';

export interface AzureSsoConfig {
  clientId: string;
  tenantId: string;
}

@Injectable({
  providedIn: 'root'
})
export class MsalBrowserService {
  private msalInstance: PublicClientApplication | null = null;
  private initializationPromise: Promise<void> | null = null;

  async initialize(config: AzureSsoConfig): Promise<void> {
    if (this.initializationPromise) return this.initializationPromise;

    const msalConfig: Configuration = {
      auth: {
        clientId: config.clientId,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
        redirectUri: window.location.origin
      },
      cache: {
        cacheLocation: BrowserCacheLocation.SessionStorage,
        storeAuthStateInCookie: false
      }
    };

    this.msalInstance = new PublicClientApplication(msalConfig);
    this.initializationPromise = this.msalInstance.initialize();
    return this.initializationPromise;
  }

  async loginPopup(): Promise<AuthenticationResult> {
    if (!this.msalInstance) {
      throw new Error('MsalBrowserService no inicializado. Llame initialize() primero.');
    }

    const request: PopupRequest = {
      scopes: ['openid', 'profile', 'email', 'User.Read']
    };

    return this.msalInstance.loginPopup(request);
  }

  reset(): void {
    this.msalInstance = null;
    this.initializationPromise = null;
  }
}
