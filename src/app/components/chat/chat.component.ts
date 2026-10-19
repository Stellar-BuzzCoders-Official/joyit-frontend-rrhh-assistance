import { Component, ElementRef, ViewChild, OnInit, Input, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth/auth'; // Ajusta la ruta

interface MessageType {
  id: string;
  content: string | { file_type: string; source: { type: string; file_name: string; media_type: string; data: string } } | any;
  role: 'user' | 'assistant' | 'system';
  file?: File | null;
  validate?: boolean;
  technicalReport?: any;
  technical_report?: any; // Agregamos esta propiedad para manejar la respuesta de la API
}

type ProcessPhase = 'request_requirements' | 'upload_cv_and_match' | 'analyzing';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {
  @ViewChild('messagesEnd') messagesEndRef!: ElementRef;
  @ViewChild('fileInput') fileInputRef!: ElementRef;

  // Agregar la propiedad @Input() para selectedChat
  @Input() selectedChat: any = null;

  private endpoint = '/api/v0/screeningChat';
  private apiUrl = environment.apiBaseUrl + this.endpoint;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  exampleText = 'Conocimiento indispensable de análisis, patrones de diseño y patrones de arquitectura de software y sistemas. Conocimiento en arquitectura, infraestructura, redes, y microservicios en Cloud y OnPremise. Buenas prácticas de desarrollo y software seguro...';

  messages: MessageType[] = [
    {
      id: '77c4c070-ee71-4267-84ce-1c6c2b65932e',
      content: `Hola soy tu RRHH assistant, para empezar dame los requerimientos técnicos.`,
      role: 'system'
    }
  ];

  input = '';
  file: File | null = null;
  isLoading = false;
  processPhase: ProcessPhase = 'request_requirements';
  conversationId = '';

  ngOnInit() {
    this.scrollToBottom();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    // Solo ejecutar en el browser
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      if (this.messagesEndRef && this.messagesEndRef.nativeElement) {
        // Verificar si scrollIntoView está disponible
        if (this.messagesEndRef.nativeElement.scrollIntoView) {
          this.messagesEndRef.nativeElement.scrollIntoView({ behavior: 'smooth' });
        } else {
          // Fallback para browsers que no soportan scrollIntoView
          const element = this.messagesEndRef.nativeElement;
          const container = element.parentElement;
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        }
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  private getMimeType(filename: string): string {
    const ext = this.getFileExtension(filename);
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      this.file = target.files[0];
    }
  }

  clearFile(): void {
    this.file = null;
    if (this.fileInputRef) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  onFileButtonClick(): void {
    if (!this.isLoading) {
      this.fileInputRef.nativeElement.click();
    }
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if ((!this.input && !this.file) || this.isLoading) return;
    if (this.processPhase === 'upload_cv_and_match' && !this.file) return;

    this.isLoading = true;

    try {
      let userMessageContent: string | { file_type: string; source: { type: string; file_name: string; media_type: string; data: string } };

      if (this.file) {
        const base64Data = await this.fileToBase64(this.file);
        const fileType = this.getFileExtension(this.file.name);
        const mediaType = this.getMimeType(this.file.name);

        userMessageContent = {
          file_type: fileType,
          source: {
            type: 'base64',
            file_name: this.file.name,
            media_type: mediaType,
            data: base64Data
          }
        };
      } else {
        userMessageContent = this.input;
      }

      const userMessage: MessageType = {
        id: this.generateId(),
        content: userMessageContent,
        role: 'user',
        file: this.file
      };

      const userMessageForDisplay: MessageType = {
        ...userMessage,
        content: typeof userMessageContent === 'string'
          ? userMessageContent
          : `Archivo: ${(userMessageContent as any).source.file_name}`
      };

      // Construir el array de mensajes localmente
      const localMessages = [
        ...this.messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: typeof msg.content === 'string'
            ? msg.content
            : typeof msg.content === 'object' && msg.content !== null && 'file_type' in msg.content
              ? msg.content
              : ''
        })),
        {
          id: userMessage.id,
          role: userMessage.role,
          content: userMessage.content
        }
      ];

      this.messages.push(userMessageForDisplay);
      this.input = '';

      const messageData = {
        conversation_id: this.conversationId || undefined,
        process_phase: this.processPhase || 'request_requirements',
        userID: this.authService.getUserId(),
        message: localMessages
      };

      // Obtener headers con autenticación
      const authHeaders = this.authService.getAuthHeaders();

      // Convertir HttpHeaders a objeto plano para fetch
      const headers: Record<string, string> = {};
      authHeaders.keys().forEach((key: string) => {
        const values = authHeaders.getAll(key);
        if (values) {
          headers[key] = values.join(', ');
        }
      });

      const payload = { data: messageData };

      // Debug: log del payload que se está enviando
      console.log('Enviando payload:', JSON.stringify(payload, null, 2));
      console.log('Headers:', headers);

      const response = await fetch(
        this.apiUrl,
        {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        // Obtener el cuerpo de la respuesta de error para más detalles
        let errorMessage = 'Error en la respuesta del servidor';
        try {
          const errorData = await response.text();
          console.error('Error response:', errorData);
          errorMessage = `Error ${response.status}: ${errorData}`;
        } catch (e) {
          console.error('No se pudo leer el error del servidor');
        }

        // Si es 401 (no autorizado), podría ser que el token expiró
        if (response.status === 401) {
          this.authService.logout();
          throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.data.conversation_id) {
        this.conversationId = data.data.conversation_id;
      }

      const botMessage = data.data.message[data.data.message.length - 1];

      // Procesar el reporte técnico correctamente
      let processedTechnicalReport = null;
      if (botMessage.technical_report) {
        processedTechnicalReport = botMessage.technical_report;
      } else if (botMessage.technicalReport) {
        processedTechnicalReport = botMessage.technicalReport;
      }

      this.messages.push({
        id: botMessage.id || this.generateId(),
        content: botMessage.content,
        role: 'assistant',
        validate: botMessage.validate,
        technicalReport: processedTechnicalReport
      });

      if (botMessage.validate) {
        this.processPhase = 'upload_cv_and_match';
      } else if (data.data.process_phase) {
        this.processPhase = data.data.process_phase;
      }

    } catch (error) {
      console.error('Error:', error);
      this.messages.push({
        id: this.generateId(),
        content: error instanceof Error ? error.message : 'Lo siento, ha ocurrido un error. Por favor, intenta de nuevo.',
        role: 'system'
      });
    } finally {
      this.isLoading = false;
      this.clearFile();
    }
  }

  newChat(): void {
    this.messages = [
      {
        id: this.generateId(),
        content: `Hola soy tu RRHH assistant, para empezar dame los requerimientos técnicos.`,
        role: 'system'
      }
    ];
    this.conversationId = '';
    this.processPhase = 'request_requirements';
    this.file = null;
    this.input = '';
  }

  getMessageDisplayContent(message: MessageType): string {
    if (typeof message.content === 'string') {
      return message.content;
    }
    if (typeof message.content === 'object' && message.file) {
      return `Archivo enviado: ${message.file.name}`;
    }
    return 'Contenido no disponible';
  }

  isFileMessage(message: MessageType): boolean {
    return !!(message.file && typeof message.content === 'object');
  }

  // Método para verificar si el mensaje tiene reporte técnico
  hasTechnicalReport(message: MessageType): boolean {
    return !!(message.technicalReport && Object.keys(message.technicalReport).length > 0);
  }

  // Método para obtener el reporte técnico
  getTechnicalReport(message: MessageType): any {
    return message.technicalReport;
  }

  // Método para obtener el nombre de la categoría en español
  getCategoryName(category: string): string {
    const categoryNames: Record<string, string> = {
      'designAndPatterns': 'Diseño y Patrones',
      'architecture': 'Arquitectura',
      'development': 'Desarrollo',
      'database': 'Base de Datos',
      'methodologies': 'Metodologías',
      'security': 'Seguridad',
      'tools': 'Herramientas',
      'cloud': 'Cloud',
      'devops': 'DevOps'
    };
    return categoryNames[category] || category;
  }

  shouldShowInput(): boolean {
    return this.processPhase !== 'upload_cv_and_match';
  }

  isSubmitDisabled(): boolean {
    if (this.processPhase === 'upload_cv_and_match') {
      return !this.file || this.isLoading;
    }
    return (!this.input && !this.file) || this.isLoading;
  }

  isInputDisabled(): boolean {
    return this.isLoading || !!this.file;
  }

  isFileInputDisabled(): boolean {
    return this.isLoading || (this.processPhase !== 'upload_cv_and_match' && !!this.input);
  }
}
