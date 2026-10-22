import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { ChatbotComponent } from './pages/chatbot/chatbot.component';
import { SettingsComponent } from './components/settings/settings.component';

const isPopup = typeof window !== 'undefined' && !!(window.opener && window.opener !== window);

export const routes: Routes = isPopup
  ? []
  : [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      { path: 'login', component: LoginComponent },
      { path: 'chatbot', component: ChatbotComponent },
      { path: 'settings', component: SettingsComponent },
    ];
