import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Interfaces para el request y response
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_data?: any; // Ajusta según la estructura de tu user_data
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Usar la variable de entorno
  private apiUrl = `${environment.apiBaseUrl}/api/v0/auth`;
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Solo verificar el token si estamos en el browser
    if (isPlatformBrowser(this.platformId)) {
      this.isAuthenticatedSubject.next(this.hasToken());
    }
  }

  login(loginData: LoginRequest): Observable<LoginResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, loginData, { headers })
      .pipe(
        tap(response => {
          if (isPlatformBrowser(this.platformId)) {
            // Guardar token en localStorage solo si estamos en el browser
            localStorage.setItem('access_token', response.access_token);
            localStorage.setItem('token_type', response.token_type);
            if (response.user_data) {
              localStorage.setItem('user_data', JSON.stringify(response.user_data));
            } else if ((response as any).user) {
              localStorage.setItem('user_data', JSON.stringify((response as any).user));
            }

            // Actualizar estado de autenticación
            this.isAuthenticatedSubject.next(true);
          }
        })
      );
  }

  private msalInstance: any = null;

  private clearMsalInteractionLocks(): void {
    if (typeof window === 'undefined') return;
    try {
      const storages = [sessionStorage, localStorage];
      for (const storage of storages) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && (key.includes('interaction_status') || key.includes('interaction.status') || key.includes('interaction_in_progress'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => storage.removeItem(k));
      }
    } catch (e) {
      console.warn('No se pudieron limpiar las claves de interacción de MSAL:', e);
    }
  }

  private async getMsalInstance(): Promise<any> {
    if (this.msalInstance) return this.msalInstance;

    const { PublicClientApplication } = await import('@azure/msal-browser');

    const msalConfig = {
      auth: {
        clientId: environment.azureAd?.clientId || 'ae7c6bcf-a228-4e18-8c76-c44eab86da03',
        authority: `https://login.microsoftonline.com/${environment.azureAd?.tenantId || '0ceb204d-9306-498e-90d5-e8bdee8f5d58'}`,
        redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200',
        navigateToLoginRequestUrl: false
      },
      cache: {
        cacheLocation: 'localStorage' as const,
        storeAuthStateInCookie: false
      }
    };

    this.msalInstance = new PublicClientApplication(msalConfig);
    await this.msalInstance.initialize();
    return this.msalInstance;
  }

  async initAuth(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;

    try {
      const instance = await this.getMsalInstance();
      const response = await instance.handleRedirectPromise();

      if (response && response.account) {
        const account = response.account;
        const token = response.idToken || response.accessToken;

        localStorage.setItem('access_token', token);
        localStorage.setItem('token_type', 'Bearer');
        localStorage.setItem('user_data', JSON.stringify({
          id: account.homeAccountId || account.localAccountId,
          userID: account.homeAccountId || account.localAccountId,
          email: account.username,
          name: account.name || account.username,
          role: 'recruiter'
        }));

        this.isAuthenticatedSubject.next(true);
        return true;
      }
    } catch (err) {
      console.error('Error procesando respuesta de Microsoft Entra ID:', err);
    }
    return false;
  }

  async handlePopupCallback(): Promise<void> {
    await this.initAuth();
  }

  async loginWithMicrosoft(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;

    try {
      const instance = await this.getMsalInstance();
      this.clearMsalInteractionLocks();

      let loginResponse = null;
      const accounts = instance.getAllAccounts();
      if (accounts && accounts.length > 0) {
        try {
          loginResponse = await instance.acquireTokenSilent({
            account: accounts[0],
            scopes: ['openid', 'profile', 'email']
          });
        } catch {
          loginResponse = null;
        }
      }

      if (loginResponse && loginResponse.account) {
        const account = loginResponse.account;
        const token = loginResponse.idToken || loginResponse.accessToken;

        localStorage.setItem('access_token', token);
        localStorage.setItem('token_type', 'Bearer');
        localStorage.setItem('user_data', JSON.stringify({
          id: account.homeAccountId || account.localAccountId,
          userID: account.homeAccountId || account.localAccountId,
          email: account.username,
          name: account.name || account.username,
          role: 'recruiter'
        }));

        this.isAuthenticatedSubject.next(true);
        return true;
      }

      // Redirección directa en la misma ventana para evitar bloqueos de popup y bucles
      await instance.loginRedirect({
        scopes: ['openid', 'profile', 'email'],
        prompt: 'select_account'
      });
      return false;
    } catch (err: any) {
      this.clearMsalInteractionLocks();
      console.error('Error durante autenticación con Microsoft Entra ID:', err);
      throw err;
    }
  }

  getUserId(): string {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('user_data');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          return user.userID || user.userId || user.user_id || user.id || 'a8f0569a-46fd-457f-847e-e233af403114';
        } catch {}
      }
    }
    return 'a8f0569a-46fd-457f-847e-e233af403114';
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.clear(); // Limpia todo el localStorage
    }
    this.isAuthenticatedSubject.next(false);
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  getTokenType(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token_type');
    }
    return null;
  }

  hasToken(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return !!this.getToken();
    }
    return false;
  }

  // Método para obtener headers con autorización
  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    const tokenType = this.getTokenType() || 'Bearer';

    if (token) {
      return new HttpHeaders({
        'Authorization': `${tokenType} ${token}`,
        'Content-Type': 'application/json'
      });
    }

    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }
}
