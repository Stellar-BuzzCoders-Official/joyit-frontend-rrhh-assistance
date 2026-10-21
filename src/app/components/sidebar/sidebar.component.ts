import { Component, OnInit, Output, EventEmitter, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth/auth';

export interface ChatHistoryItem {
  id: string;
  title: string;
  updatedAt?: string;
  processPhase?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  chatHistory: ChatHistoryItem[] = [];
  selectedChatId: string | null = null;
  isLoading = false;
  searchQuery = '';
  isSearching = false;

  @Output() chatSelected = new EventEmitter<ChatHistoryItem>();
  @Output() newChat = new EventEmitter<void>();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadChatHistory();
  }

  async loadChatHistory(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const token = this.authService.getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${environment.apiBaseUrl}/api/v1/threads`, {
        method: 'GET',
        headers
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          this.chatHistory = data
            .map((t: any) => ({
              id: t.id,
              title: t.nameHistory || 'Conversación de Selección',
              updatedAt: t.updatedAt,
              processPhase: t.processPhase
            }))
            .sort((a, b) => {
              const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
              const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
              return dateB - dateA;
            });
        }
      } else {
        console.warn('No se pudo cargar el historial de conversaciones:', response.status);
      }
    } catch (err) {
      console.error('Error cargando historial de conversaciones:', err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  get filteredChatHistory(): ChatHistoryItem[] {
    if (!this.searchQuery.trim()) {
      return this.chatHistory;
    }
    const q = this.searchQuery.toLowerCase();
    return this.chatHistory.filter(c => c.title.toLowerCase().includes(q));
  }

  selectChat(chat: ChatHistoryItem): void {
    this.selectedChatId = chat.id;
    this.chatSelected.emit(chat);
  }

  startNewChat(): void {
    this.selectedChatId = null;
    this.newChat.emit();
  }

  async deleteChat(event: MouseEvent, threadId: string): Promise<void> {
    event.stopPropagation();
    if (!confirm('¿Deseas eliminar esta conversación del historial?')) {
      return;
    }

    try {
      const token = this.authService.getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${environment.apiBaseUrl}/api/v1/threads/${threadId}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        this.chatHistory = this.chatHistory.filter(c => c.id !== threadId);
        if (this.selectedChatId === threadId) {
          this.startNewChat();
        }
        this.cdr.detectChanges();
      }
    } catch (err) {
      console.error('Error al eliminar conversación:', err);
    }
  }

  toggleSearch(): void {
    this.isSearching = !this.isSearching;
    if (!this.isSearching) {
      this.searchQuery = '';
    }
  }
}
