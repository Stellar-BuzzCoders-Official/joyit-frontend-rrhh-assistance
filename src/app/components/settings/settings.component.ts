import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth';

@Component({
  selector: 'app-senttings',
  imports: [],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {

  constructor(private router: Router, private authService: AuthService) {}

  onLogout() {
  this.authService.logout();
  this.router.navigate(['/login']);
  console.log('Sesión cerrada');
}
}
