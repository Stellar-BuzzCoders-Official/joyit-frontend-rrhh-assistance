import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

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
  private apiUrl = 'https://joyit-cn-ai-screening-chatbot-a7dsb6bqg3e8bxef.brazilsouth-01.azurewebsites.net/api/v0/auth';
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(loginData: LoginRequest): Observable<LoginResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, loginData, { headers })
      .pipe(
        tap(response => {
          // Guardar token en localStorage
          localStorage.setItem('access_token', response.access_token);
          localStorage.setItem('token_type', response.token_type);

          // Actualizar estado de autenticación
          this.isAuthenticatedSubject.next(true);
        })
      );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_type');
    this.isAuthenticatedSubject.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getTokenType(): string | null {
    return localStorage.getItem('token_type');
  }

  hasToken(): boolean {
    return !!this.getToken();
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
