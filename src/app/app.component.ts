import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
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
  isPopup = false;

  constructor(private authService: AuthService) {
    if (typeof window !== 'undefined' && window.opener && window.opener !== window) {
      this.isPopup = true;
    }
  }

  ngOnInit(): void {
    if (this.isPopup) {
      this.authService.handlePopupCallback().finally(() => {
        setTimeout(() => {
          try {
            if (typeof window !== 'undefined' && window.opener) {
              window.close();
            }
          } catch {}
        }, 800);
      });

      // Fallback de cierre por si el callback no emite evento
      setTimeout(() => {
        try {
          if (typeof window !== 'undefined' && window.opener) {
            window.close();
          }
        } catch {}
      }, 2500);
    }
  }
}

