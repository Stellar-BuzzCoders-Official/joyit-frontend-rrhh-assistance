import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatComponent } from '../../components/chat/chat.component';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, ChatComponent, SidebarComponent],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css'
})
export class ChatbotComponent {
  @ViewChild('chat') chatComponent?: ChatComponent;
  @ViewChild('sidebar') sidebarComponent?: SidebarComponent;

  currentChat: any = null;
  isSidebarOpen: boolean = true;

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  onChatSelected(chat: any): void {
    this.currentChat = chat;
  }

  onNewChat(): void {
    this.currentChat = null;
    if (this.chatComponent) {
      this.chatComponent.newChat();
    }
  }
}
