import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Output } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})

export class SidebarComponent {
  chatHistory = [
    { id: 1, title: 'Chat con AI - 01' },
    { id: 2, title: 'Chat con AI - 02' },
  ];

  @Output() chatSelected = new EventEmitter<any>();
  @Output() newChat = new EventEmitter<void>();

  selectChat(chat: any) {
    this.chatSelected.emit(chat);
  }

  startNewChat() {
    this.newChat.emit();
  }

}
