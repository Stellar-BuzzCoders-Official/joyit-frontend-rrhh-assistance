import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Input } from '@angular/core';
import { FormsModule } from '@angular/forms';



@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent {
  @Input() selectedChat: any;

  messages: { from: string; text: string }[] = [];
  userInput = '';

  ngOnChanges() {
    if (this.selectedChat) {
      // Cargar mensajes del chat seleccionado, por ejemplo:
      this.messages = [
        { from: 'Bot', text: 'Hola, ¿en qué puedo ayudarte?' },
        // Aquí cargarías mensajes reales según el chat
      ];
    }
  }

  sendMessage(event: Event) {
    event.preventDefault();

    if (!this.userInput.trim()) return;

    this.messages.push({ from: 'Usuario', text: this.userInput });

    // Simular respuesta bot
    setTimeout(() => {
      this.messages.push({ from: 'Bot', text: 'Esta es una respuesta simulada.' });
    }, 1000);

    this.userInput = '';
  }

}
