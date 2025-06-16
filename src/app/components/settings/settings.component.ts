import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-senttings',
  imports: [],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {

  constructor(private router: Router) {}

  onLogout() {
    // Aquí puedes agregar la lógica de logout
    // Por ejemplo: limpiar localStorage, tokens, etc.
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');

    // Opcional: llamar a un servicio de autenticación
    // this.authService.logout();

    // Redirigir al login
    this.router.navigate(['/login']);

    console.log('Sesión cerrada');
  }
}
