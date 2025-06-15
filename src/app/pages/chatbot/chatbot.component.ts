import { Component } from '@angular/core';
import { ChatComponent } from '../../components/chat/chat.component';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [ChatComponent,SidebarComponent],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css'
})
export class ChatbotComponent {
   currentChat: any = null;

  onChatSelected(chat: any) {
    this.currentChat = chat;
  }

  onNewChat() {
    this.currentChat = { id: Date.now(), title: `Chat nuevo ${Date.now()}` };
  }

}
