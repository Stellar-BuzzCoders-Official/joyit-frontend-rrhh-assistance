import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { AuthService } from './services/auth/auth';

@Component({
  selector: 'app-root',
  standalone: true, 
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'RRHH_ASSITANCE_FT';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    // Si quedó alguna ventana emergente de un intento previo, cerrarla
    if (typeof window !== 'undefined' && window.opener && window.opener !== window) {
      try {
        await this.authService.initAuth();
        window.close();
        return;
      } catch {}
    }

    // Procesar callback de retorno de Microsoft Entra ID
    try {
      const authenticated = await this.authService.initAuth();
      if (authenticated) {
        this.router.navigate(['/chatbot']);
      }
    } catch (e) {
      console.warn('Error inicializando autenticación:', e);
    }
  }
}

