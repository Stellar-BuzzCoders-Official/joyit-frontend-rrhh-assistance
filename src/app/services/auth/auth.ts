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

            // Actualizar estado de autenticación
            this.isAuthenticatedSubject.next(true);
          }
        })
      );
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
