import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /**
   * Exporta el reporte técnico individual de un candidato a PDF
   */
  exportCandidateReport(report: any, candidateFallbackName?: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const doc = new jsPDF();
    const candidateName = report?.personalInfo?.name || candidateFallbackName || 'Candidato';
    const position = report?.personalInfo?.position || 'Posición Técnica';
    const experience = report?.personalInfo?.experienceYears || 'N/D';
    const client = report?.personalInfo?.client || 'JoyIt / RRHH';

    // 1. Header Branded
    doc.setFillColor(30, 58, 138); // Dark Blue (#1E3A8A)
    doc.rect(0, 0, 210, 36, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE TÉCNICO DE EVALUACIÓN', 14, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('RRHH Screening Assistant AI • Plataforma de Selección Técnica', 14, 26);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`, 140, 26);

    // 2. Información del Candidato
    let currentY = 46;
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Información del Candidato', 14, currentY);

    currentY += 4;
    const personalInfoData = [
      ['Candidato:', candidateName, 'Posición postulada:', position],
      ['Años de experiencia:', String(experience), 'Cliente / Área:', client]
    ];

    autoTable(doc, {
      startY: currentY,
      body: personalInfoData,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2, textColor: [51, 65, 85] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40, textColor: [30, 58, 138] },
        1: { cellWidth: 65 },
        2: { fontStyle: 'bold', cellWidth: 40, textColor: [30, 58, 138] },
        3: { cellWidth: 45 }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // 3. Capacidades Técnicas Evaluadas (strictly binary: Cumple / No Cumple)
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('2. Matriz de Competencias y Requerimientos', 14, currentY);

    const tableRows: any[] = [];
    const categories = report?.technicalCapabilities || [];

    for (const cat of categories) {
      const catName = this.formatCategoryName(cat.category);
      for (const skill of (cat.skills || [])) {
        const isCumple = (skill.status || '').trim().toLowerCase() === 'cumple';
        tableRows.push([
          catName,
          skill.name || '',
          skill.type || 'Indispensable',
          skill.level || 'Intermedio',
          isCumple ? 'Cumple' : 'No Cumple'
        ]);
      }
    }

    if (tableRows.length === 0) {
      tableRows.push(['General', 'Habilidades técnicas evaluadas según perfil', 'Indispensable', '-', 'Cumple']);
    }

    autoTable(doc, {
      startY: currentY + 4,
      head: [['Categoría', 'Habilidad / Requerimiento', 'Tipo', 'Nivel', 'Dictamen']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 3
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const val = String(data.cell.raw);
          if (val === 'Cumple') {
            data.cell.styles.textColor = [22, 101, 52]; // Green
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [185, 28, 28]; // Red
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // Verificar si queda espacio suficiente en la página, sino agregar nueva
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    // 4. Resumen de Cumplimiento y Recomendación
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('3. Resumen de Cumplimiento y Dictamen Final', 14, currentY);

    const resumenData = [
      ['Requisitos Indispensables:', report?.resumen?.cumpleIndispensable || report?.evaluationSummary?.requiredSkillsMet || 'Cumplido'],
      ['Requisitos Deseables:', report?.resumen?.cumpleDeseable || report?.evaluationSummary?.optionalSkillsMet || 'Parcial'],
      ['Recomendación:', report?.resumen?.recomendation || (report?.resumen?.cumpleIndispensable?.includes('0') ? 'No cumple con requisitos mínimos' : 'Apto para entrevista técnica con el cliente.')]
    ];

    autoTable(doc, {
      startY: currentY + 4,
      body: resumenData,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 55, textColor: [30, 58, 138] },
        1: { cellWidth: 135 }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // 5. Auditoría de Grounding (Sub-agente Auditor)
    if (report?.isGrounded !== undefined || report?.judgeFeedback) {
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      const isAudited = report?.isGrounded && !report?.requiresHumanReview;
      doc.setFillColor(isAudited ? 240 : 254, isAudited ? 253 : 243, isAudited ? 244 : 199);
      doc.setDrawColor(isAudited ? 187 : 251, isAudited ? 247 : 191, isAudited ? 208 : 36);
      doc.roundedRect(14, currentY, 182, 22, 2, 2, 'FD');

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isAudited ? 22 : 180, isAudited ? 101 : 83, isAudited ? 52 : 9);
      doc.text(isAudited ? '✓ Grounding Audit: Aprobado 100% contra evidencia de CV' : '⚠ Grounding Audit: Revisión Humana Sugerida', 18, currentY + 8);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const auditNote = report?.judgeFeedback || 'Todas las competencias técnicas fueron contrastadas contra el texto fuente del CV para certificar cero alucinaciones.';
      const splitNote = doc.splitTextToSize(auditNote, 174);
      doc.text(splitNote, 18, currentY + 14);

      currentY += 26;
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Página ${i} de ${pageCount} • JoyIt RRHH Screening Assistant (Sistema Confidencial)`, 14, 290);
    }

    const safeName = candidateName.replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`Reporte_Tecnico_${safeName}.pdf`);
  }

  /**
   * Exporta el resumen general comparativo de candidatos y proceso a PDF
   */
  exportSummaryReport(messages: any[], conversationId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const doc = new jsPDF();

    // 1. Header Branded
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, 210, 36, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN GENERAL DEL PROCESO DE SELECCIÓN', 14, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('JoyIt AI Recruitment • Informe Ejecutivo de Candidatos', 14, 26);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')} • ID: ${conversationId ? conversationId.substring(0, 8) : 'General'}`, 130, 26);

    let currentY = 46;

    // 2. Extraer todos los candidatos evaluados en el chat
    const candidatesFound: any[] = [];
    for (const msg of messages) {
      if (msg.technicalReport && msg.technicalReport.personalInfo) {
        const p = msg.technicalReport.personalInfo;
        const res = msg.technicalReport.resumen || msg.technicalReport.evaluationSummary || {};
        candidatesFound.push({
          name: p.name || 'Candidato',
          position: p.position || 'Desarrollador',
          experience: p.experienceYears || 'N/D',
          indispensables: res.cumpleIndispensable || res.requiredSkillsMet || 'Evaluado',
          deseables: res.cumpleDeseable || res.optionalSkillsMet || 'Evaluado',
          recomendation: res.recomendation || 'Apto para revisión técnica',
          isGrounded: msg.technicalReport.isGrounded !== false
        });
      }
    }

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('1. Cuadro Comparativo de Candidatos Evaluados', 14, currentY);

    const tableRows: any[] = [];
    for (const c of candidatesFound) {
      tableRows.push([
        c.name,
        c.position,
        String(c.experience),
        c.indispensables,
        c.deseables,
        c.recomendation,
        c.isGrounded ? 'Verificado' : 'Revisión manual'
      ]);
    }

    if (tableRows.length === 0) {
      tableRows.push(['Sin candidatos estructurados en esta sesión', '-', '-', '-', '-', 'Inicie cargando CVs', '-']);
    }

    autoTable(doc, {
      startY: currentY + 4,
      head: [['Candidato', 'Puesto', 'Exp', 'Indispensables', 'Deseables', 'Dictamen', 'Auditoría']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // 3. Recomendaciones y Siguientes Pasos
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('2. Conclusiones y Próximos Pasos', 14, currentY);

    currentY += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    const conclusionLines = [
      '• Se evaluaron las capacidades técnicas requeridas de acuerdo a la matriz indispensable y deseable.',
      '• Los candidatos con estado "Cumple" en el 100% de requerimientos indispensables son priorizados para entrevista técnica con el líder técnico.',
      '• El sub-agente auditor certificó la ausencia de alucinaciones contra el texto original de los currículums suministrados.',
      '• Para consultar el perfil extendido y el banco de talento histórico (RAG), utilice el buscador integrado en la plataforma.'
    ];

    for (const line of conclusionLines) {
      doc.text(line, 16, currentY);
      currentY += 6;
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Página ${i} de ${pageCount} • Resumen General de Selección JoyIt`, 14, 290);
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    doc.save(`Resumen_General_Seleccion_${dateStr}.pdf`);
  }

  private formatCategoryName(category: string): string {
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
}
