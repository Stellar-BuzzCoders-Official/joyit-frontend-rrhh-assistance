import { Component, ElementRef, ViewChild, OnInit, AfterViewChecked, Input, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth/auth';

interface AttachedFile {
  name: string;
  size: number;
}

interface MessageType {
  id: string;
  content: string | any;
  role: 'user' | 'assistant' | 'system';
  file?: File | null;
  files?: AttachedFile[];
  validate?: boolean;
  technicalReport?: any;
  technical_report?: any;
  isStreaming?: boolean;
}

type ProcessPhase = 'request_requirements' | 'upload_cv_and_match' | 'analyzing';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesEnd') messagesEndRef!: ElementRef;
  @ViewChild('fileInput') fileInputRef!: ElementRef;

  @Input() selectedChat: any = null;

  private streamUrl = `${environment.apiBaseUrl}/api/v1/chat/stream`;
  private bulkUploadUrl = `${environment.apiBaseUrl}/api/v1/files/bulk`;

  exampleText = 'Conocimiento indispensable de análisis, patrones de diseño y patrones de arquitectura de software y sistemas. Conocimiento en arquitectura, infraestructura, redes, y microservicios en Cloud y OnPremise. Buenas prácticas de desarrollo y software seguro...';

  messages: MessageType[] = [
    {
      id: '77c4c070-ee71-4267-84ce-1c6c2b65932e',
      content: `Hola soy tu RRHH assistant, para empezar dame los requerimientos técnicos.`,
      role: 'system'
    }
  ];

  input = '';
  files: File[] = [];
  readonly maxFiles = 10;
  readonly allowedExtensions = ['pdf', 'docx', 'doc', 'txt'];

  isLoading = false;
  streamingStatusText = '';
  processPhase: ProcessPhase = 'request_requirements';
  conversationId = '';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.scrollToBottom();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      if (this.messagesEndRef && this.messagesEndRef.nativeElement) {
        if (this.messagesEndRef.nativeElement.scrollIntoView) {
          this.messagesEndRef.nativeElement.scrollIntoView({ behavior: 'smooth' });
        } else {
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

  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;

    const newFiles: File[] = Array.from(target.files);
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    for (const f of newFiles) {
      const ext = this.getFileExtension(f.name);
      if (this.allowedExtensions.includes(ext)) {
        validFiles.push(f);
      } else {
        invalidFiles.push(f.name);
      }
    }

    if (invalidFiles.length > 0) {
      alert(`Los siguientes archivos tienen un formato no permitido (solo .pdf, .docx, .doc, .txt):\n${invalidFiles.join('\n')}`);
    }

    if (this.files.length + validFiles.length > this.maxFiles) {
      const availableSlots = this.maxFiles - this.files.length;
      if (availableSlots > 0) {
        this.files.push(...validFiles.slice(0, availableSlots));
        alert(`Se alcanzó el límite máximo de ${this.maxFiles} archivos. Se añadieron los primeros ${availableSlots} archivo(s).`);
      } else {
        alert(`Ya alcanzaste el límite máximo de ${this.maxFiles} archivos.`);
      }
    } else {
      this.files.push(...validFiles);
    }

    if (this.fileInputRef && this.fileInputRef.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
    this.cdr.detectChanges();
  }

  removeFile(index: number): void {
    if (index >= 0 && index < this.files.length) {
      this.files.splice(index, 1);
      this.cdr.detectChanges();
    }
  }

  clearFiles(): void {
    this.files = [];
    if (this.fileInputRef && this.fileInputRef.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
    this.cdr.detectChanges();
  }

  formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 KB';
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  onFileButtonClick(): void {
    if (!this.isLoading && this.files.length < this.maxFiles) {
      this.fileInputRef.nativeElement.click();
    }
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();

    const trimmedInput = this.input.trim();
    if ((!trimmedInput && this.files.length === 0) || this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.streamingStatusText = '';

    const currentFiles = [...this.files];
    const attachedFilesInfo: AttachedFile[] = currentFiles.map(f => ({
      name: f.name,
      size: f.size
    }));

    const userDisplayText = trimmedInput || (currentFiles.length > 0 ? `Evaluación solicitada para ${currentFiles.length} archivo(s) adjunto(s).` : '');

    // Agregar mensaje del usuario a la lista
    const userMessage: MessageType = {
      id: this.generateId(),
      content: userDisplayText,
      role: 'user',
      files: attachedFilesInfo
    };
    this.messages.push(userMessage);

    this.input = '';
    this.clearFiles();
    this.scrollToBottom();

    // Mensaje del asistente que se irá completando con el streaming
    const assistantMessage: MessageType = {
      id: this.generateId(),
      content: '',
      role: 'assistant',
      isStreaming: true,
      technicalReport: null
    };
    this.messages.push(assistantMessage);
    this.cdr.detectChanges();

    try {
      let fileIds: string[] = [];

      // Si hay archivos adjuntos, primero los subimos en bloque al endpoint /api/v1/files/bulk
      if (currentFiles.length > 0) {
        this.streamingStatusText = `📤 Subiendo ${currentFiles.length} CV(s) y procesando con Azure Document Intelligence...`;
        this.cdr.detectChanges();

        const formData = new FormData();
        for (const file of currentFiles) {
          formData.append('files', file, file.name);
        }

        const uploadHeaders: Record<string, string> = {};
        const token = this.authService.getToken();
        if (token) {
          uploadHeaders['Authorization'] = `Bearer ${token}`;
        }

        const uploadResponse = await fetch(this.bulkUploadUrl, {
          method: 'POST',
          headers: uploadHeaders,
          body: formData
        });

        if (!uploadResponse.ok) {
          let errDetail = 'Error al subir los archivos';
          try {
            const errJson = await uploadResponse.json();
            errDetail = errJson.detail || JSON.stringify(errJson);
          } catch {
            errDetail = await uploadResponse.text();
          }
          throw new Error(`Fallo en la carga de archivos: ${errDetail}`);
        }

        const uploadData = await uploadResponse.json();
        if (uploadData && Array.isArray(uploadData.files)) {
          fileIds = uploadData.files.map((f: any) => f.file_id);
        }
      }

      this.streamingStatusText = '⚡ Conectando con el asistente de RRHH...';
      this.cdr.detectChanges();

      // Construir payload para /api/v1/chat/stream
      const chatPayload = {
        thread_id: this.conversationId || undefined,
        message: trimmedInput || (fileIds.length > 0 ? 'Evalúa los CVs adjuntos en base a los requerimientos técnicos del puesto.' : ''),
        file_id: fileIds.length > 0 ? fileIds[0] : undefined,
        file_ids: fileIds.length > 0 ? fileIds : undefined
      };

      const chatHeaders: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      const token = this.authService.getToken();
      if (token) {
        chatHeaders['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(this.streamUrl, {
        method: 'POST',
        headers: chatHeaders,
        body: JSON.stringify(chatPayload)
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.authService.logout();
          throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        }
        let errDetail = 'Error en el servidor de chat';
        try {
          const errJson = await response.json();
          errDetail = errJson.detail || JSON.stringify(errJson);
        } catch {
          errDetail = await response.text();
        }
        throw new Error(`Error en el asistente (${response.status}): ${errDetail}`);
      }

      // Procesar SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No se pudo inicializar el lector de stream en el navegador.');
      }

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || ''; // El último fragmento puede estar incompleto

        for (const rawEvent of events) {
          if (!rawEvent.trim()) continue;
          const lines = rawEvent.split('\n');
          let eventType = 'message';
          let dataStr = '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.replace('event:', '').trim();
            } else if (line.startsWith('data:')) {
              dataStr += line.replace('data:', '').trim();
            }
          }

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            this.handleSSEEvent(eventType, data, assistantMessage);
          } catch (e) {
            console.error('Error parseando evento SSE:', dataStr, e);
          }
        }

        this.cdr.detectChanges();
        this.scrollToBottom();
      }

    } catch (error: any) {
      console.error('Error durante el flujo de chat:', error);
      assistantMessage.isStreaming = false;
      this.streamingStatusText = '';
      if (!assistantMessage.content) {
        assistantMessage.content = error instanceof Error ? error.message : 'Lo siento, ha ocurrido un error al procesar tu solicitud.';
      } else {
        this.messages.push({
          id: this.generateId(),
          content: `⚠️ Error: ${error.message || error}`,
          role: 'system'
        });
      }
    } finally {
      this.isLoading = false;
      assistantMessage.isStreaming = false;
      this.streamingStatusText = '';
      this.cdr.detectChanges();
      this.scrollToBottom();
    }
  }

  private handleSSEEvent(eventType: string, data: any, assistantMessage: MessageType): void {
    switch (eventType) {
      case 'init':
        if (data.thread_id) {
          this.conversationId = data.thread_id;
        }
        break;

      case 'input_grounding':
        this.streamingStatusText = '🛡️ Validando adecuación de requerimientos y políticas de seguridad...';
        break;

      case 'tool_start':
        if (data.tool === 'set_job_requirements') {
          this.streamingStatusText = '📋 Guardando y estructurando perfil del puesto...';
        } else if (data.tool === 'evaluate_cv') {
          this.streamingStatusText = '🔍 Evaluando competencias del CV contra los requerimientos técnicos...';
        } else if (data.tool === 'search_talent_pool') {
          this.streamingStatusText = '👥 Consultando candidatos afines en el Talent Pool histórico (RAG)...';
        } else {
          this.streamingStatusText = `⚙️ Ejecutando herramienta: ${data.tool}...`;
        }
        break;

      case 'token':
        this.streamingStatusText = '';
        if (data.text) {
          assistantMessage.content = (assistantMessage.content || '') + data.text;
        }
        break;

      case 'judge_verdict':
        if (data) {
          if (!assistantMessage.technicalReport) {
            assistantMessage.technicalReport = {};
          }
          const isApproved = data.approved !== undefined ? data.approved : data.is_grounded;
          assistantMessage.technicalReport.isGrounded = isApproved;
          assistantMessage.technicalReport.requiresHumanReview = (isApproved === false) || (data.confidenceScore !== undefined && data.confidenceScore < 0.8);
          if (data.reasoning || data.issues) {
            assistantMessage.technicalReport.judgeFeedback = data.reasoning || (Array.isArray(data.issues) ? data.issues.join('; ') : '');
          }
        }
        this.streamingStatusText = '⚖️ Auditoría de grounding del sub-agente auditor completada.';
        break;

      case 'report':
        if (data) {
          assistantMessage.technicalReport = { ...assistantMessage.technicalReport, ...data };
        }
        this.streamingStatusText = '';
        break;

      case 'done':
        assistantMessage.isStreaming = false;
        this.streamingStatusText = '';
        if (data?.data?.process_phase) {
          this.processPhase = data.data.process_phase;
        }
        const botPayload = data?.data?.message?.[0];
        if (botPayload) {
          const report = botPayload.technical_report || botPayload.technicalReport;
          if (report) {
            assistantMessage.technicalReport = { ...assistantMessage.technicalReport, ...report };
          }
          if (botPayload.content && !assistantMessage.content) {
            assistantMessage.content = botPayload.content;
          }
          if (botPayload.validate !== undefined) {
            assistantMessage.validate = botPayload.validate;
          }
        }
        break;

      case 'error':
        assistantMessage.isStreaming = false;
        this.streamingStatusText = '';
        const errMsg = data.error || 'Error inesperado del servidor';
        this.messages.push({
          id: this.generateId(),
          content: `⚠️ Error del asistente: ${errMsg}`,
          role: 'system'
        });
        break;

      default:
        break;
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
    this.clearFiles();
    this.input = '';
    this.streamingStatusText = '';
    this.isLoading = false;
  }

  getMessageDisplayContent(message: MessageType): string {
    if (typeof message.content === 'string') {
      return message.content;
    }
    return 'Contenido no disponible';
  }

  isFileMessage(message: MessageType): boolean {
    return !!(message.files && message.files.length > 0) || !!message.file;
  }

  hasTechnicalReport(message: MessageType): boolean {
    return !!(
      message.technicalReport &&
      typeof message.technicalReport === 'object' &&
      (
        message.technicalReport.personalInfo ||
        message.technicalReport.technicalCapabilities ||
        message.technicalReport.resumen ||
        message.technicalReport.evaluationSummary
      )
    );
  }

  getTechnicalReport(message: MessageType): any {
    return message.technicalReport;
  }

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
    return true;
  }

  isSubmitDisabled(): boolean {
    if (this.isLoading) return true;
    return this.files.length === 0 && !this.input.trim();
  }

  isInputDisabled(): boolean {
    return this.isLoading;
  }

  isFileInputDisabled(): boolean {
    return this.isLoading || this.files.length >= this.maxFiles;
  }
}
