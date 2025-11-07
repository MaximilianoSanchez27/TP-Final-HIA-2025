import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { MetricasAfiliadosAvanzadas } from './afiliado.service';
import { PaymentMetrics } from './payment.service';
import { MetricasAvanzadas } from './cobro.service';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor() { }

  /**
   * Exporta las analíticas a PDF capturando el HTML
   */
  async exportAnalyticsToPDF(
    elementId: string,
    metricas: MetricasAfiliadosAvanzadas,
    fileName: string = 'analiticas-afiliados'
  ): Promise<void> {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error('Elemento no encontrado');
      }

      // Configurar el elemento para la captura
      const originalStyle = element.style.cssText;
      element.style.backgroundColor = '#ffffff';
      element.style.padding = '20px';

      // Capturar el elemento como imagen
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        height: element.scrollHeight,
        width: element.scrollWidth
      });

      // Restaurar estilo original
      element.style.cssText = originalStyle;

      // Crear PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190; // Ancho en mm para A4
      const pageHeight = 297; // Alto de página A4 en mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;

      // Añadir header del PDF
      pdf.setFontSize(16);
      pdf.setTextColor(55, 65, 81); // Color gris serio
      pdf.text('Analíticas de Afiliados - Reporte', 10, position);

      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 10, position + 7);
      pdf.text(`Total Afiliados: ${metricas.resumen.totalAfiliados}`, 10, position + 14);

      position += 25;

      // Añadir la imagen del contenido
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - position;

      // Añadir páginas adicionales si es necesario
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Guardar el PDF
      pdf.save(`${fileName}-${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
      console.error('Error al exportar PDF:', error);
      throw new Error('Error al generar el PDF');
    }
  }

  /**
   * Exporta los datos de analíticas a Excel
   */
  async exportAnalyticsToExcel(
    metricas: MetricasAfiliadosAvanzadas,
    fileName: string = 'analiticas-afiliados'
  ): Promise<void> {
    try {
      const workbook = new ExcelJS.Workbook();

      // Configuración general del workbook
      workbook.creator = 'Sistema FJV';
      workbook.created = new Date();
      workbook.modified = new Date();

      // === HOJA 1: RESUMEN GENERAL ===
      const resumenSheet = workbook.addWorksheet('Resumen General');

      // Título principal
      resumenSheet.mergeCells('A1:E1');
      const titleCell = resumenSheet.getCell('A1');
      titleCell.value = 'ANALÍTICAS DE AFILIADOS - RESUMEN GENERAL';
      titleCell.font = { size: 16, bold: true, color: { argb: '374151' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };

      // Información de generación
      resumenSheet.getCell('A3').value = 'Fecha de generación:';
      resumenSheet.getCell('B3').value = new Date().toLocaleDateString('es-ES');
      resumenSheet.getCell('A4').value = 'Última actualización:';
      resumenSheet.getCell('B4').value = new Date(metricas.fechaActualizacion).toLocaleDateString('es-ES');

      // Métricas principales
      resumenSheet.getCell('A6').value = 'MÉTRICAS PRINCIPALES';
      resumenSheet.getCell('A6').font = { bold: true, color: { argb: '374151' } };

      const metricas_principales = [
        ['Total Afiliados', metricas.resumen.totalAfiliados],
        ['Licencias FJV', metricas.resumen.totalFJV],
        ['Licencias FEVA', metricas.resumen.totalFEVA],
        ['Activos', metricas.resumen.activosCount],
        ['Vencidos', metricas.resumen.vencidosCount],
        ['Próximos Vencimientos', metricas.resumen.proxVencimientos]
      ];

      metricas_principales.forEach((metrica, index) => {
        const row = 7 + index;
        resumenSheet.getCell(`A${row}`).value = metrica[0];
        resumenSheet.getCell(`B${row}`).value = metrica[1];
        resumenSheet.getCell(`A${row}`).font = { bold: true };
      });

      // === HOJA 2: DISTRIBUCIÓN POR CLUB ===
      const clubSheet = workbook.addWorksheet('Distribución por Club');

      // Título
      clubSheet.mergeCells('A1:G1');
      const clubTitleCell = clubSheet.getCell('A1');
      clubTitleCell.value = 'DISTRIBUCIÓN DE AFILIADOS POR CLUB';
      clubTitleCell.font = { size: 14, bold: true, color: { argb: '374151' } };
      clubTitleCell.alignment = { horizontal: 'center' };
      clubTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };

      // Headers
      const clubHeaders = ['Club', 'Total', 'FJV', 'FEVA', 'Activos', 'Vencidos', '% Activos'];
      clubHeaders.forEach((header, index) => {
        const cell = clubSheet.getCell(3, index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '6B7280' } };
        cell.alignment = { horizontal: 'center' };
      });

      // Datos
      metricas.distribucionPorClub.forEach((club, index) => {
        const row = 4 + index;
        clubSheet.getCell(row, 1).value = club.nombre;
        clubSheet.getCell(row, 2).value = club.total;
        clubSheet.getCell(row, 3).value = club.fjv;
        clubSheet.getCell(row, 4).value = club.feva;
        clubSheet.getCell(row, 5).value = club.activos;
        clubSheet.getCell(row, 6).value = club.vencidos;

        const porcentajeActivos = club.total > 0 ? (club.activos / club.total * 100) : 0;
        clubSheet.getCell(row, 7).value = `${porcentajeActivos.toFixed(1)}%`;

        // Colorear según porcentaje
        const percentCell = clubSheet.getCell(row, 7);
        if (porcentajeActivos >= 80) {
          percentCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D1FAE5' } };
        } else if (porcentajeActivos >= 50) {
          percentCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
        } else {
          percentCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };
        }
      });

      // === HOJA 3: DISTRIBUCIÓN POR CATEGORÍA ===
      const categoriaSheet = workbook.addWorksheet('Distribución por Categoría');

      // Título
      categoriaSheet.mergeCells('A1:B1');
      const catTitleCell = categoriaSheet.getCell('A1');
      catTitleCell.value = 'DISTRIBUCIÓN POR CATEGORÍA';
      catTitleCell.font = { size: 14, bold: true, color: { argb: '374151' } };
      catTitleCell.alignment = { horizontal: 'center' };
      catTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };

      // Headers
      categoriaSheet.getCell('A3').value = 'Categoría';
      categoriaSheet.getCell('B3').value = 'Cantidad';
      ['A3', 'B3'].forEach(cell => {
        const cellRef = categoriaSheet.getCell(cell);
        cellRef.font = { bold: true, color: { argb: 'FFFFFF' } };
        cellRef.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '6B7280' } };
        cellRef.alignment = { horizontal: 'center' };
      });

      // Datos
      metricas.distribucionPorCategoria.forEach((categoria, index) => {
        const row = 4 + index;
        categoriaSheet.getCell(row, 1).value = categoria.categoria;
        categoriaSheet.getCell(row, 2).value = categoria.cantidad;
      });

      // === HOJA 4: REGISTROS MENSUALES ===
      const mensualSheet = workbook.addWorksheet('Registros Mensuales');

      // Título
      mensualSheet.mergeCells('A1:D1');
      const menTitleCell = mensualSheet.getCell('A1');
      menTitleCell.value = 'EVOLUCIÓN MENSUAL DE REGISTROS';
      menTitleCell.font = { size: 14, bold: true, color: { argb: '374151' } };
      menTitleCell.alignment = { horizontal: 'center' };
      menTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };

      // Headers
      const mensualHeaders = ['Mes', 'Total', 'FJV', 'FEVA'];
      mensualHeaders.forEach((header, index) => {
        const cell = mensualSheet.getCell(3, index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '6B7280' } };
        cell.alignment = { horizontal: 'center' };
      });

      // Datos
      metricas.registrosMensuales.forEach((registro, index) => {
        const row = 4 + index;
        mensualSheet.getCell(row, 1).value = registro.mes;
        mensualSheet.getCell(row, 2).value = registro.total;
        mensualSheet.getCell(row, 3).value = registro.fjv;
        mensualSheet.getCell(row, 4).value = registro.feva;
      });

      // Ajustar ancho de columnas en todas las hojas
      [resumenSheet, clubSheet, categoriaSheet, mensualSheet].forEach(sheet => {
        sheet.columns.forEach(column => {
          column.width = 15;
        });

        // Bordes para todas las celdas con datos
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber >= 3) {
            row.eachCell(cell => {
              cell.border = {
                top: { style: 'thin', color: { argb: 'E5E7EB' } },
                left: { style: 'thin', color: { argb: 'E5E7EB' } },
                bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
                right: { style: 'thin', color: { argb: 'E5E7EB' } }
              };
            });
          }
        });
      });

      // Generar y descargar el archivo
      console.log('Generando buffer del workbook...');
      const buffer = await workbook.xlsx.writeBuffer();
      console.log('Buffer generado, tamaño:', buffer.byteLength, 'bytes');

      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      console.log('Blob creado, tamaño:', blob.size, 'bytes');

      const finalFileName = `${fileName}-${new Date().toISOString().split('T')[0]}.xlsx`;
      console.log('Guardando Excel como:', finalFileName);

      saveAs(blob, finalFileName);
      console.log('Excel exportado exitosamente');

    } catch (error) {
      console.error('Error al exportar Excel:', error);
      throw new Error('Error al generar el archivo Excel');
    }
  }

  /**
   * Exporta las métricas de pagos a PDF capturando el HTML
   */
  async exportPaymentMetricsToPDF(
    elementId: string,
    metricas: PaymentMetrics,
    fileName: string = 'metricas-pagos'
  ): Promise<void> {
    try {
      console.log('Iniciando exportación PDF...');
      console.log('Element ID:', elementId);
      console.log('Métricas:', metricas);

      const element = document.getElementById(elementId);
      if (!element) {
        console.error('Elemento no encontrado:', elementId);
        throw new Error(`Elemento ${elementId} no encontrado`);
      }

      console.log('Elemento encontrado:', element);
      console.log('Dimensiones del elemento:', {
        width: element.offsetWidth,
        height: element.offsetHeight,
        scrollWidth: element.scrollWidth,
        scrollHeight: element.scrollHeight
      });

      // Configurar el elemento para la captura
      const originalStyle = element.style.cssText;
      element.style.backgroundColor = '#ffffff';
      element.style.padding = '20px';

      console.log('Iniciando captura con html2canvas...');

      // Capturar el elemento como imagen
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        height: element.scrollHeight,
        width: element.scrollWidth,
        logging: true // Habilitar logging de html2canvas
      });

      console.log('Captura completada. Canvas dimensions:', {
        width: canvas.width,
        height: canvas.height
      });

      // Restaurar estilo original
      element.style.cssText = originalStyle;

      // Crear PDF
      console.log('Creando PDF...');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190; // Ancho en mm para A4
      const pageHeight = 297; // Alto de página A4 en mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;

      // Añadir header del PDF
      pdf.setFontSize(16);
      pdf.setTextColor(55, 65, 81); // Color gris serio
      pdf.text('Métricas de Pagos - Reporte Financiero', 10, position);

      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 10, position + 7);
      pdf.text(`Total Recaudado: $${metricas.montos.totalRecaudado.toLocaleString('es-AR')}`, 10, position + 14);

      position += 25;

      // Añadir la imagen del contenido
      const imgData = canvas.toDataURL('image/png');
      console.log('Agregando imagen al PDF...');
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - position;

      // Añadir páginas adicionales si es necesario
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Guardar el PDF
      const finalFileName = `${fileName}-${new Date().toISOString().split('T')[0]}.pdf`;
      console.log('Guardando PDF como:', finalFileName);

      pdf.save(finalFileName);
      console.log('PDF exportado exitosamente');

    } catch (error) {
      console.error('Error detallado en exportación PDF:', error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
      }
      throw new Error(`Error al generar el PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Exporta las métricas de pagos a Excel
   */
  async exportPaymentMetricsToExcel(
    metricas: PaymentMetrics,
    fileName: string = 'metricas-pagos'
  ): Promise<void> {
    try {
      console.log('Iniciando exportación Excel...');
      console.log('Métricas para Excel:', metricas);

      const workbook = new ExcelJS.Workbook();

      // Configuración general del workbook
      workbook.creator = 'Sistema FJV';
      workbook.created = new Date();
      workbook.modified = new Date();

      console.log('Workbook creado, generando hojas...');

      // === HOJA 1: RESUMEN FINANCIERO ===
      console.log('Creando hoja: Resumen Financiero');
      const resumenSheet = workbook.addWorksheet('Resumen Financiero');

      // Título principal
      resumenSheet.mergeCells('A1:E1');
      const titleCell = resumenSheet.getCell('A1');
      titleCell.value = 'MÉTRICAS DE PAGOS - RESUMEN FINANCIERO';
      titleCell.font = { size: 16, bold: true, color: { argb: '374151' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };

      // Información de generación
      resumenSheet.getCell('A3').value = 'Fecha de generación:';
      resumenSheet.getCell('B3').value = new Date().toLocaleDateString('es-ES');
      resumenSheet.getCell('A4').value = 'Última actualización:';
      resumenSheet.getCell('B4').value = new Date(metricas.fechaActualizacion).toLocaleDateString('es-ES');

      // Métricas de montos
      resumenSheet.getCell('A6').value = 'MÉTRICAS FINANCIERAS';
      resumenSheet.getCell('A6').font = { bold: true, color: { argb: '374151' } };

      const metricas_financieras = [
        ['Total Recaudado', `$${metricas.montos.totalRecaudado.toLocaleString('es-AR')}`],
        ['Monto Promedio', `$${metricas.montos.promedioMonto.toLocaleString('es-AR')}`],
        ['Monto Mayor', `$${metricas.montos.montoMayor.toLocaleString('es-AR')}`],
        ['Monto Menor', `$${metricas.montos.montoMenor.toLocaleString('es-AR')}`]
      ];

      metricas_financieras.forEach((metrica, index) => {
        const row = 7 + index;
        resumenSheet.getCell(`A${row}`).value = metrica[0];
        resumenSheet.getCell(`B${row}`).value = metrica[1];
        resumenSheet.getCell(`A${row}`).font = { bold: true };
      });

      // Métricas por estado
      resumenSheet.getCell('A12').value = 'ESTADO DE PAGOS';
      resumenSheet.getCell('A12').font = { bold: true, color: { argb: '374151' } };

      const metricas_estado = [
        ['Pagados', metricas.porEstado.pagados],
        ['Pendientes', metricas.porEstado.pendientes],
        ['Vencidos', metricas.porEstado.vencidos],
        ['Anulados', metricas.porEstado.anulados]
      ];

      metricas_estado.forEach((metrica, index) => {
        const row = 13 + index;
        resumenSheet.getCell(`A${row}`).value = metrica[0];
        resumenSheet.getCell(`B${row}`).value = metrica[1];
        resumenSheet.getCell(`A${row}`).font = { bold: true };
      });

      // === HOJA 2: RENDIMIENTO POR CLUB ===
      const clubSheet = workbook.addWorksheet('Rendimiento por Club');

      // Título
      clubSheet.mergeCells('A1:G1');
      const clubTitleCell = clubSheet.getCell('A1');
      clubTitleCell.value = 'RENDIMIENTO FINANCIERO POR CLUB';
      clubTitleCell.font = { size: 14, bold: true, color: { argb: '374151' } };
      clubTitleCell.alignment = { horizontal: 'center' };
      clubTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };

      // Headers
      const clubHeaders = ['Club', 'Total Cobros', 'Recaudado ($)', 'Pagados', 'Pendientes', 'Vencidos', '% Efectividad'];
      clubHeaders.forEach((header, index) => {
        const cell = clubSheet.getCell(3, index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '6B7280' } };
        cell.alignment = { horizontal: 'center' };
      });

      // Datos
      metricas.porClub.forEach((club, index) => {
        const row = 4 + index;
        clubSheet.getCell(row, 1).value = club.club;
        clubSheet.getCell(row, 2).value = club.totalCobros;
        clubSheet.getCell(row, 3).value = club.totalRecaudado;
        clubSheet.getCell(row, 4).value = club.pagados;
        clubSheet.getCell(row, 5).value = club.pendientes;
        clubSheet.getCell(row, 6).value = club.vencidos;

        const efectividad = club.totalCobros > 0 ? (club.pagados / club.totalCobros * 100) : 0;
        clubSheet.getCell(row, 7).value = `${efectividad.toFixed(1)}%`;

        // Colorear según efectividad
        const effectCell = clubSheet.getCell(row, 7);
        if (efectividad >= 80) {
          effectCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D1FAE5' } };
        } else if (efectividad >= 60) {
          effectCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
        } else {
          effectCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };
        }

        // Formatear monto como moneda
        clubSheet.getCell(row, 3).numFmt = '"$"#,##0';
      });

      // === HOJA 3: EVOLUCIÓN MENSUAL ===
      const mensualSheet = workbook.addWorksheet('Evolución Mensual');

      // Título
      mensualSheet.mergeCells('A1:D1');
      const menTitleCell = mensualSheet.getCell('A1');
      menTitleCell.value = 'EVOLUCIÓN MENSUAL DE COBROS';
      menTitleCell.font = { size: 14, bold: true, color: { argb: '374151' } };
      menTitleCell.alignment = { horizontal: 'center' };
      menTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };

      // Headers
      const mensualHeaders = ['Mes', 'Total Cobros', 'Recaudado ($)', 'Tasa de Pago (%)'];
      mensualHeaders.forEach((header, index) => {
        const cell = mensualSheet.getCell(3, index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '6B7280' } };
        cell.alignment = { horizontal: 'center' };
      });

      // Datos
      metricas.porMes.forEach((mes, index) => {
        const row = 4 + index;
        mensualSheet.getCell(row, 1).value = mes.mes;
        mensualSheet.getCell(row, 2).value = mes.totalCobros;
        mensualSheet.getCell(row, 3).value = mes.totalRecaudado;
        mensualSheet.getCell(row, 4).value = mes.tasaPago;

        // Formatear monto como moneda
        mensualSheet.getCell(row, 3).numFmt = '"$"#,##0';

        // Colorear tasa de pago
        const rateCell = mensualSheet.getCell(row, 4);
        if (mes.tasaPago >= 80) {
          rateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D1FAE5' } };
        } else if (mes.tasaPago >= 60) {
          rateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
        } else {
          rateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };
        }
      });

      // === HOJA 4: MÉTODOS DE PAGO ===
      const metodosSheet = workbook.addWorksheet('Métodos de Pago');

      // Título
      metodosSheet.mergeCells('A1:C1');
      const metTitleCell = metodosSheet.getCell('A1');
      metTitleCell.value = 'DISTRIBUCIÓN POR MÉTODO DE PAGO';
      metTitleCell.font = { size: 14, bold: true, color: { argb: '374151' } };
      metTitleCell.alignment = { horizontal: 'center' };
      metTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };

      // Headers
      const metodosHeaders = ['Método', 'Cantidad', 'Monto ($)'];
      metodosHeaders.forEach((header, index) => {
        const cell = metodosSheet.getCell(3, index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '6B7280' } };
        cell.alignment = { horizontal: 'center' };
      });

      // Datos
      metricas.porMetodoPago.forEach((metodo, index) => {
        const row = 4 + index;
        metodosSheet.getCell(row, 1).value = metodo.metodo;
        metodosSheet.getCell(row, 2).value = metodo.cantidad;
        metodosSheet.getCell(row, 3).value = metodo.monto;

        // Formatear monto como moneda
        metodosSheet.getCell(row, 3).numFmt = '"$"#,##0';
      });

      // Ajustar ancho de columnas en todas las hojas
      [resumenSheet, clubSheet, mensualSheet, metodosSheet].forEach(sheet => {
        sheet.columns.forEach(column => {
          column.width = 15;
        });

        // Bordes para todas las celdas con datos
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber >= 3) {
            row.eachCell(cell => {
              cell.border = {
                top: { style: 'thin', color: { argb: 'E5E7EB' } },
                left: { style: 'thin', color: { argb: 'E5E7EB' } },
                bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
                right: { style: 'thin', color: { argb: 'E5E7EB' } }
              };
            });
          }
        });
      });

      // Generar y descargar el archivo
      console.log('Generando buffer del workbook...');
      const buffer = await workbook.xlsx.writeBuffer();
      console.log('Buffer generado, tamaño:', buffer.byteLength, 'bytes');

      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      console.log('Blob creado, tamaño:', blob.size, 'bytes');

      const finalFileName = `${fileName}-${new Date().toISOString().split('T')[0]}.xlsx`;
      console.log('Guardando Excel como:', finalFileName);

      saveAs(blob, finalFileName);
      console.log('Excel exportado exitosamente');

    } catch (error) {
      console.error('Error al exportar Excel de pagos:', error);
      throw new Error('Error al generar el archivo Excel');
    }
  }

  /**
   * Exporta las métricas de cobros a PDF capturando el HTML
   */
  async exportCobroMetricsToPDF(
    elementId: string,
    metricas: MetricasAvanzadas,
    fileName: string = 'metricas-cobros'
  ): Promise<void> {
    try {
      console.log('Iniciando exportación PDF de cobros...');
      console.log('Element ID:', elementId);
      console.log('Métricas de cobros:', metricas);

      const element = document.getElementById(elementId);
      if (!element) {
        console.error('Elemento no encontrado:', elementId);
        throw new Error(`Elemento ${elementId} no encontrado`);
      }

      console.log('Elemento encontrado:', element);
      console.log('Dimensiones del elemento:', {
        width: element.offsetWidth,
        height: element.offsetHeight,
        scrollWidth: element.scrollWidth,
        scrollHeight: element.scrollHeight
      });

      // Configurar el elemento para la captura
      const originalStyle = element.style.cssText;
      element.style.backgroundColor = '#ffffff';
      element.style.padding = '20px';

      console.log('Iniciando captura con html2canvas...');

      // Capturar el elemento como imagen
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        height: element.scrollHeight,
        width: element.scrollWidth,
        logging: true
      });

      console.log('Captura completada. Canvas dimensions:', {
        width: canvas.width,
        height: canvas.height
      });

      // Restaurar estilo original
      element.style.cssText = originalStyle;

      // Crear PDF
      console.log('Creando PDF...');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;

      // Añadir header del PDF
      pdf.setFontSize(16);
      pdf.setTextColor(55, 65, 81);
      pdf.text('Métricas de Cobros - Reporte Financiero', 10, position);

      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 10, position + 7);
      pdf.text(`Total Recaudado: $${metricas.resumen.totalRecaudado.toLocaleString('es-AR')}`, 10, position + 14);

      position += 25;

      // Añadir la imagen del contenido
      const imgData = canvas.toDataURL('image/png');
      console.log('Agregando imagen al PDF...');
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - position;

      // Añadir páginas adicionales si es necesario
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Guardar el PDF
      const finalFileName = `${fileName}-${new Date().toISOString().split('T')[0]}.pdf`;
      console.log('Guardando PDF como:', finalFileName);

      pdf.save(finalFileName);
      console.log('PDF exportado exitosamente');

    } catch (error) {
      console.error('Error detallado en exportación PDF:', error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
      }
      throw new Error(`Error al generar el PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Exporta las métricas de cobros a Excel
   */
  async exportCobroMetricsToExcel(
    metricas: MetricasAvanzadas,
    fileName: string = 'metricas-cobros'
  ): Promise<void> {
    try {
      console.log('Iniciando exportación Excel de cobros...');
      console.log('Métricas de cobros para Excel:', metricas);

      const workbook = new ExcelJS.Workbook();

      // Configuración general del workbook
      workbook.creator = 'Sistema FJV';
      workbook.created = new Date();
      workbook.modified = new Date();

      console.log('Workbook creado, generando hojas...');

      // === HOJA 1: RESUMEN FINANCIERO ===
      console.log('Creando hoja: Resumen Financiero');
      const resumenSheet = workbook.addWorksheet('Resumen Financiero');

      // Título principal
      resumenSheet.mergeCells('A1:E1');
      const titleCell = resumenSheet.getCell('A1');
      titleCell.value = 'MÉTRICAS DE COBROS - RESUMEN FINANCIERO';
      titleCell.font = { size: 16, bold: true, color: { argb: '374151' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };

      // Información de generación
      resumenSheet.getCell('A3').value = 'Fecha de generación:';
      resumenSheet.getCell('B3').value = new Date().toLocaleDateString('es-ES');
      resumenSheet.getCell('A4').value = 'Última actualización:';
      resumenSheet.getCell('B4').value = new Date(metricas.fechaActualizacion).toLocaleDateString('es-ES');

      // Métricas principales
      resumenSheet.getCell('A6').value = 'MÉTRICAS PRINCIPALES';
      resumenSheet.getCell('A6').font = { bold: true, color: { argb: '374151' } };

      const metricas_principales = [
        ['Total Cobros', metricas.resumen.totalCobros],
        ['Total Recaudado', `$${metricas.resumen.totalRecaudado.toLocaleString('es-AR')}`],
        ['Total Pendiente', `$${metricas.resumen.totalPendiente.toLocaleString('es-AR')}`],
        ['Tasa de Cobro', `${metricas.resumen.tasaCobro.toFixed(1)}%`]
      ];

      metricas_principales.forEach((metrica, index) => {
        const row = 7 + index;
        resumenSheet.getCell(`A${row}`).value = metrica[0];
        resumenSheet.getCell(`B${row}`).value = metrica[1];
        resumenSheet.getCell(`A${row}`).font = { bold: true };
      });

      // Métricas por estado
      resumenSheet.getCell('A12').value = 'ESTADO DE COBROS';
      resumenSheet.getCell('A12').font = { bold: true, color: { argb: '374151' } };

      const metricas_estado = [
        ['Pagados', metricas.porEstado.Pagado],
        ['Pendientes', metricas.porEstado.Pendiente],
        ['Vencidos', metricas.porEstado.Vencido],
        ['Anulados', metricas.porEstado.Anulado]
      ];

      metricas_estado.forEach((metrica, index) => {
        const row = 13 + index;
        resumenSheet.getCell(`A${row}`).value = metrica[0];
        resumenSheet.getCell(`B${row}`).value = metrica[1];
        resumenSheet.getCell(`A${row}`).font = { bold: true };
      });

      // === HOJA 2: RENDIMIENTO POR CLUB ===
      const clubSheet = workbook.addWorksheet('Rendimiento por Club');

      // Título
      clubSheet.mergeCells('A1:F1');
      const clubTitleCell = clubSheet.getCell('A1');
      clubTitleCell.value = 'RENDIMIENTO FINANCIERO POR CLUB';
      clubTitleCell.font = { size: 14, bold: true, color: { argb: '374151' } };
      clubTitleCell.alignment = { horizontal: 'center' };
      clubTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };

      // Headers
      const clubHeaders = ['Club', 'Cantidad', 'Total ($)', 'Recaudado ($)', 'Pendiente ($)', '% Cobrado'];
      clubHeaders.forEach((header, index) => {
        const cell = clubSheet.getCell(3, index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '6B7280' } };
        cell.alignment = { horizontal: 'center' };
      });

      // Datos
      metricas.porClub.forEach((club, index) => {
        const row = 4 + index;
        clubSheet.getCell(row, 1).value = club.nombre;
        clubSheet.getCell(row, 2).value = club.cantidad;
        clubSheet.getCell(row, 3).value = club.total;
        clubSheet.getCell(row, 4).value = club.recaudado;
        clubSheet.getCell(row, 5).value = club.pendiente;

        const efectividad = club.total > 0 ? (club.recaudado / club.total * 100) : 0;
        clubSheet.getCell(row, 6).value = `${efectividad.toFixed(1)}%`;

        // Colorear según efectividad
        const effectCell = clubSheet.getCell(row, 6);
        if (efectividad >= 80) {
          effectCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D1FAE5' } };
        } else if (efectividad >= 60) {
          effectCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
        } else {
          effectCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };
        }

        // Formatear montos como moneda
        clubSheet.getCell(row, 3).numFmt = '"$"#,##0';
        clubSheet.getCell(row, 4).numFmt = '"$"#,##0';
        clubSheet.getCell(row, 5).numFmt = '"$"#,##0';
      });

      // === HOJA 3: EVOLUCIÓN MENSUAL ===
      const mensualSheet = workbook.addWorksheet('Evolución Mensual');

      // Título
      mensualSheet.mergeCells('A1:D1');
      const menTitleCell = mensualSheet.getCell('A1');
      menTitleCell.value = 'EVOLUCIÓN MENSUAL DE COBROS';
      menTitleCell.font = { size: 14, bold: true, color: { argb: '374151' } };
      menTitleCell.alignment = { horizontal: 'center' };
      menTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };

      // Headers
      const mensualHeaders = ['Mes', 'Total', 'Recaudado ($)', 'Pendiente ($)'];
      mensualHeaders.forEach((header, index) => {
        const cell = mensualSheet.getCell(3, index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '6B7280' } };
        cell.alignment = { horizontal: 'center' };
      });

      // Datos
      metricas.mensuales.forEach((mes, index) => {
        const row = 4 + index;
        mensualSheet.getCell(row, 1).value = mes.mes;
        mensualSheet.getCell(row, 2).value = mes.total;
        mensualSheet.getCell(row, 3).value = mes.recaudado;
        mensualSheet.getCell(row, 4).value = mes.pendiente;

        // Formatear montos como moneda
        mensualSheet.getCell(row, 3).numFmt = '"$"#,##0';
        mensualSheet.getCell(row, 4).numFmt = '"$"#,##0';
      });

      // === HOJA 4: DISTRIBUCIÓN POR CONCEPTO ===
      const conceptoSheet = workbook.addWorksheet('Por Concepto');

      // Título
      conceptoSheet.mergeCells('A1:B1');
      const conceptoTitleCell = conceptoSheet.getCell('A1');
      conceptoTitleCell.value = 'DISTRIBUCIÓN POR CONCEPTO';
      conceptoTitleCell.font = { size: 14, bold: true, color: { argb: '374151' } };
      conceptoTitleCell.alignment = { horizontal: 'center' };
      conceptoTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };

      // Headers
      const conceptoHeaders = ['Concepto', 'Total ($)'];
      conceptoHeaders.forEach((header, index) => {
        const cell = conceptoSheet.getCell(3, index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '6B7280' } };
        cell.alignment = { horizontal: 'center' };
      });

      // Datos
      metricas.porConcepto.forEach((concepto, index) => {
        const row = 4 + index;
        conceptoSheet.getCell(row, 1).value = concepto.concepto;
        conceptoSheet.getCell(row, 2).value = concepto.total;

        // Formatear monto como moneda
        conceptoSheet.getCell(row, 2).numFmt = '"$"#,##0';
      });

      // Ajustar ancho de columnas en todas las hojas
      [resumenSheet, clubSheet, mensualSheet, conceptoSheet].forEach(sheet => {
        sheet.columns.forEach(column => {
          column.width = 15;
        });

        // Bordes para todas las celdas con datos
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber >= 3) {
            row.eachCell(cell => {
              cell.border = {
                top: { style: 'thin', color: { argb: 'E5E7EB' } },
                left: { style: 'thin', color: { argb: 'E5E7EB' } },
                bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
                right: { style: 'thin', color: { argb: 'E5E7EB' } }
              };
            });
          }
        });
      });

      // Generar y descargar el archivo
      console.log('Generando buffer del workbook...');
      const buffer = await workbook.xlsx.writeBuffer();
      console.log('Buffer generado, tamaño:', buffer.byteLength, 'bytes');

      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      console.log('Blob creado, tamaño:', blob.size, 'bytes');

      const finalFileName = `${fileName}-${new Date().toISOString().split('T')[0]}.xlsx`;
      console.log('Guardando Excel como:', finalFileName);

      saveAs(blob, finalFileName);
      console.log('Excel exportado exitosamente');

    } catch (error) {
      console.error('Error al exportar Excel de cobros:', error);
      throw new Error('Error al generar el archivo Excel');
    }
  }
}
