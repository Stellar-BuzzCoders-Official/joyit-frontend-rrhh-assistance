import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './../auth/auth';
@Injectable({
  providedIn: 'root'
})
export class AuthGuardService {

    constructor(
      private authService: AuthService,
      private router: Router
    ) {}

    canActivate(): Observable<boolean> {
      return this.authService.isAuthenticated$.pipe(
        map(isAuthenticated => {
          if (isAuthenticated) {
            return true;
          } else {
            // Redirigir al login si no está autenticado
            this.router.navigate(['/login']);
            return false;
          }
        })
      );
  }
}
