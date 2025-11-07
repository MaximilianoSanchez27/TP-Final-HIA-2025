import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AfiliadoService } from '../../../../services/afiliado.service';
import { FiltrosAvanzadosService, OpcionesFiltrosAvanzados, ClubConEstadisticas, CategoriaConInfo } from '../../../../services/filtros-avanzados.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface FiltrosAvanzados {
  // Filtros básicos de persona
  dni?: string;
  apellidoNombre?: string;
  estadoLicencia?: string;
  tipo?: string[];
  categoria?: string;
  categoriaNivel?: string;
  fechaNacimientoDesde?: string;
  fechaNacimientoHasta?: string;
  fechaLicenciaDesde?: string;
  fechaLicenciaHasta?: string;

  // Filtros de edad
  edadDesde?: number;
  edadHasta?: number;

  // Filtros de club
  clubId?: number;
  clubNombre?: string;
  estadoAfiliacionClub?: string;
  soloConClub?: boolean; // Nuevo campo para filtrar solo los que tienen club

  // Filtros de pases
  tienePases?: boolean;
  fechaPaseDesde?: string;
  fechaPaseHasta?: string;
  estadoPase?: string;
  clubOrigenId?: number;
  clubDestinoId?: number;

  // Filtros de cobros
  tienePagos?: boolean;
  estadoPago?: string;
  conceptoCobro?: string;

  // Filtros de credenciales
  tieneCredencial?: boolean;
  estadoCredencial?: string;

  // Opciones de ordenamiento
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// Mantener interfaz legacy para compatibilidad con backend
interface OpcionesFiltros {
  clubes: any[];
  estadosLicencia: string[];
  tipos: string[];
  categorias: string[];
  categoriasNivel: string[];
  estadosPago: string[];
  estadosAfiliacionClub: string[];
  estadosPase: string[];
  clubesPases: any[];
  rangoEdades: {
    edadMinima: number;
    edadMaxima: number;
  };
}

@Component({
  selector: 'app-filtros-avanzados',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbModule],
  templateUrl: './filtros-avanzados.component.html',
  styleUrls: ['./filtros-avanzados.component.css']
})
export class FiltrosAvanzadosComponent implements OnInit {
  @Output() filtrosAplicados = new EventEmitter<FiltrosAvanzados>();
  @Output() exportarSolicitado = new EventEmitter<FiltrosAvanzados>();
  @Input() estadisticas: any = null;

  filtrosForm: FormGroup;
  tabActiva = 'basicos';
  tiposSeleccionados: string[] = [];

  // Usar las nuevas opciones enriquecidas
  opcionesAvanzadas: OpcionesFiltrosAvanzados = {
    clubes: [],
    estadosLicencia: [],
    tipos: [],
    categorias: [],
    categoriasNivel: [],
    estadosPago: [],
    estadosAfiliacionClub: [],
    estadosPase: [],
    clubesPases: [],
    rangoEdades: { edadMinima: 0, edadMaxima: 100 },
    conceptosCobro: [],
    equiposActivos: [],
    fechasVencimiento: { proximos30Dias: 0, proximos60Dias: 0, vencidos: 0 },
    estadosCredencial: ['ACTIVA', 'PENDIENTE', 'VENCIDA', 'ANULADA'] // Agregar esta propiedad faltante
  };

  // Opciones legacy para compatibilidad con template
  opciones: OpcionesFiltros = {
    clubes: [],
    estadosLicencia: [],
    tipos: [],
    categorias: [],
    categoriasNivel: [],
    estadosPago: [],
    estadosAfiliacionClub: [],
    estadosPase: [],
    clubesPases: [],
    rangoEdades: { edadMinima: 0, edadMaxima: 100 }
  };

  cargandoOpciones = false;

  constructor(
    private fb: FormBuilder,
    private afiliadoService: AfiliadoService,
    private filtrosAvanzadosService: FiltrosAvanzadosService,
    private modalService: NgbModal
  ) {
    this.filtrosForm = this.createForm();
  }

  ngOnInit() {
    this.cargarOpcionesFiltros();
    this.configurarFormSubscription();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      // Datos básicos
      dni: [''],
      apellidoNombre: [''],
      estadoLicencia: [''],
      categoria: [''],
      categoriaNivel: [''],
      fechaNacimientoDesde: [''],
      fechaNacimientoHasta: [''],
      fechaLicenciaDesde: [''],
      fechaLicenciaHasta: [''],

      // Filtros de edad
      edadDesde: [''],
      edadHasta: [''],

      // Club
      clubId: [''],
      clubNombre: [''],
      estadoAfiliacionClub: [''],
      soloConClub: [false], // Nuevo campo para filtrar solo los que tienen club

      // Pases
      tienePases: [false],
      fechaPaseDesde: [''],
      fechaPaseHasta: [''],
      estadoPase: [''],
      clubOrigenId: [''],
      clubDestinoId: [''],

      // Pagos/Cobros
      tienePagos: [false],
      estadoPago: [''],
      conceptoCobro: [''], // Nuevo campo para conceptos de cobro

      // Credenciales (nuevo)
      tieneCredencial: [false],
      estadoCredencial: [''],

      // Ordenamiento
      sortBy: ['nombreApellido'],
      sortOrder: ['ASC']
    });
  }

  private configurarFormSubscription() {
    this.filtrosForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      // Auto-aplicar filtros después de un delay si se desea
      // this.aplicarFiltros();
    });
  }

  private cargarOpcionesFiltros() {
    this.cargandoOpciones = true;
    console.log('🔄 Cargando opciones usando el servicio modular...');

    // Usar el nuevo servicio de filtros avanzados
    this.filtrosAvanzadosService.obtenerOpcionesFiltrosCompletas().subscribe({
      next: (opcionesAvanzadas: OpcionesFiltrosAvanzados) => {
        console.log('✅ Opciones avanzadas cargadas:', opcionesAvanzadas);

        this.opcionesAvanzadas = opcionesAvanzadas;

        // Mapear a la interfaz legacy para compatibilidad con el template
        this.opciones = {
          clubes: this.opcionesAvanzadas.clubes.map(club => ({
            idClub: club.idClub,
            nombre: club.nombre,
            cantidadAfiliados: club.cantidadAfiliados,
            estadoAfiliacion: club.estadoAfiliacion,
            totalCobros: club.totalCobros,
            cobrosPendientes: club.cobrosPendientes
          })),
          estadosLicencia: this.opcionesAvanzadas.estadosLicencia,
          tipos: this.opcionesAvanzadas.tipos,
          categorias: this.opcionesAvanzadas.categorias.map(cat => cat.nombre),
          categoriasNivel: this.opcionesAvanzadas.categoriasNivel,
          estadosPago: this.opcionesAvanzadas.estadosPago,
          estadosAfiliacionClub: this.opcionesAvanzadas.estadosAfiliacionClub,
          estadosPase: this.opcionesAvanzadas.estadosPase,
          clubesPases: this.opcionesAvanzadas.clubesPases.map(club => ({
            idClub: club.idClub,
            nombre: club.nombre
          })),
          rangoEdades: this.opcionesAvanzadas.rangoEdades
        };

        console.log('✅ Opciones mapeadas para template:', {
          clubes: this.opciones.clubes.length,
          categorias: this.opciones.categorias.length,
          conceptosCobro: this.opcionesAvanzadas.conceptosCobro.length,
          equipos: this.opcionesAvanzadas.equiposActivos.length
        });

        this.cargandoOpciones = false;
      },
      error: (error) => {
        console.error('❌ Error cargando opciones avanzadas:', error);
        console.log('🔄 Intentando cargar opciones básicas como fallback...');

        // Fallback al servicio original en caso de error
        this.cargarOpcionesBasicas();
      }
    });
  }

  private cargarOpcionesBasicas() {
    this.afiliadoService.obtenerOpcionesFiltros().subscribe({
      next: (response: any) => {
        console.log('✅ Opciones básicas cargadas como fallback:', response);
        if (response?.data) {
          this.opciones = {
            clubes: response.data.clubes || [],
            estadosLicencia: response.data.estadosLicencia || [],
            tipos: response.data.tipos || [],
            categorias: response.data.categorias || [],
            categoriasNivel: response.data.categoriasNivel || [],
            estadosPago: response.data.estadosPago || [],
            estadosAfiliacionClub: response.data.estadosAfiliacionClub || [],
            estadosPase: response.data.estadosPase || [],
            clubesPases: response.data.clubesPases || [],
            rangoEdades: response.data.rangoEdades || { edadMinima: 0, edadMaxima: 100 }
          };
        }
        this.cargandoOpciones = false;
      },
      error: (error) => {
        console.error('❌ Error cargando opciones básicas:', error);
        this.cargandoOpciones = false;
      }
    });
  }

  toggleTipo(tipo: string, event: any) {
    if (event.target.checked) {
      if (!this.tiposSeleccionados.includes(tipo)) {
        this.tiposSeleccionados.push(tipo);
      }
    } else {
      const index = this.tiposSeleccionados.indexOf(tipo);
      if (index > -1) {
        this.tiposSeleccionados.splice(index, 1);
      }
    }
  }

  private formatFechaParaBackend(fecha: string | null | undefined): string | null {
    if (!fecha) return null;

    try {
      // Si ya tiene formato YYYY-MM-DD, dejarlo así
      if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return fecha;
      }

      // Si tiene formato DD/MM/YYYY, convertirlo
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
        const parts = fecha.split('/');
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }

      // Intentar convertir con el objeto Date
      const fechaObj = new Date(fecha);
      if (!isNaN(fechaObj.getTime())) {
        return fechaObj.toISOString().split('T')[0];
      }
    } catch (error) {
      console.error('Error formateando fecha:', error);
    }

    return null; // En caso de no poder formatear, retornar null
  }

  aplicarFiltros() {
    const filtros: FiltrosAvanzados = {
      ...this.filtrosForm.value
    };

    // Manejar el array de tipos seleccionados
    if (this.tiposSeleccionados && this.tiposSeleccionados.length > 0) {
      filtros.tipo = this.tiposSeleccionados;
    }

    // Verificar que tenemos un valor para apellidoNombre antes de emitir
    if (filtros.apellidoNombre) {
      console.log('Enviando búsqueda por nombre:', filtros.apellidoNombre);
      // Asegurar que el campo tenga al menos 2 caracteres
      if (filtros.apellidoNombre.length < 2) {
        delete filtros.apellidoNombre;
      }
    }

    // Si estamos en la pestaña de club y se ha marcado "solo con club", asegurarnos que se envíe
    if (this.tabActiva === 'club' && !filtros.clubId && !filtros.clubNombre && !filtros.estadoAfiliacionClub) {
      filtros.soloConClub = true;
      console.log('Filtro activado: mostrar solo afiliados con club asignado');
    }

    // Si estamos en la pestaña de pases y no se ha seleccionado ningún filtro específico,
    // asegurarnos de mostrar solo los que tienen pases
    if (this.tabActiva === 'pases' && !filtros.clubOrigenId && !filtros.clubDestinoId && !filtros.estadoPase) {
      filtros.tienePases = true;
      console.log('Filtro activado: mostrar solo afiliados con pases');
    }

    // Si estamos en la pestaña de credenciales y no se ha seleccionado ningún filtro específico,
    // asegurarnos de mostrar solo los que tienen credenciales
    if (this.tabActiva === 'credenciales' && !filtros.estadoCredencial) {
      filtros.tieneCredencial = true;
      console.log('Filtro activado: mostrar solo afiliados con credenciales');
    }

    // Convertir edades a números si están presentes
    if (filtros.edadDesde) filtros.edadDesde = Number(filtros.edadDesde);
    if (filtros.edadHasta) filtros.edadHasta = Number(filtros.edadHasta);

    // Formatear fechas en formato YYYY-MM-DD
    if (filtros.fechaNacimientoDesde) {
      const fechaFormateada = this.formatFechaParaBackend(filtros.fechaNacimientoDesde as string);
      if (fechaFormateada) {
        filtros.fechaNacimientoDesde = fechaFormateada;
      } else {
        delete filtros.fechaNacimientoDesde;
      }
    }

    if (filtros.fechaNacimientoHasta) {
      const fechaFormateada = this.formatFechaParaBackend(filtros.fechaNacimientoHasta as string);
      if (fechaFormateada) {
        filtros.fechaNacimientoHasta = fechaFormateada;
      } else {
        delete filtros.fechaNacimientoHasta;
      }
    }

    if (filtros.fechaLicenciaDesde) {
      const fechaFormateada = this.formatFechaParaBackend(filtros.fechaLicenciaDesde as string);
      if (fechaFormateada) {
        filtros.fechaLicenciaDesde = fechaFormateada;
      } else {
        delete filtros.fechaLicenciaDesde;
      }
    }

    if (filtros.fechaLicenciaHasta) {
      const fechaFormateada = this.formatFechaParaBackend(filtros.fechaLicenciaHasta as string);
      if (fechaFormateada) {
        filtros.fechaLicenciaHasta = fechaFormateada;
      } else {
        delete filtros.fechaLicenciaHasta;
      }
    }

    // Limpiar valores vacíos
    Object.keys(filtros).forEach(key => {
      const value = (filtros as any)[key];
      if (value === '' || value === null || value === undefined ||
          (value === false && key !== 'soloConClub' && key !== 'tienePases' && key !== 'tieneCredencial') || // Mantener estos booleanos
          (Array.isArray(value) && value.length === 0)) {
        delete (filtros as any)[key];
      }
    });

    console.log('Aplicando filtros:', filtros);
    this.filtrosAplicados.emit(filtros);
  }

  limpiarFiltros() {
    this.filtrosForm.reset({
      sortBy: 'nombreApellido',
      sortOrder: 'ASC'
    });
    this.tiposSeleccionados = [];
    this.aplicarFiltros();
  }

  exportarExcel() {
    const filtros: FiltrosAvanzados = {
      ...this.filtrosForm.value,
      tipo: this.tiposSeleccionados.length > 0 ? this.tiposSeleccionados : undefined
    };

    // Limpiar valores vacíos
    Object.keys(filtros).forEach(key => {
      const value = (filtros as any)[key];
      if (value === '' || value === null || value === false ||
          (Array.isArray(value) && value.length === 0)) {
        delete (filtros as any)[key];
      }
    });

    console.log('Exportando con filtros:', filtros);
    this.exportarSolicitado.emit(filtros);
  }

  poblarDatosPrueba() {
    console.log('Poblando datos de prueba...');

    this.afiliadoService.poblarDatosPrueba().subscribe({
      next: (response) => {
        console.log('Datos de prueba poblados exitosamente:', response);
        alert('¡Datos de prueba insertados exitosamente! Ahora puede usar los filtros.');
        // Recargar opciones de filtros después de poblar datos
        this.cargarOpcionesFiltros();
      },
      error: (error) => {
        console.error('Error poblando datos de prueba:', error);
        alert('Error poblando datos de prueba. Revise la consola.');
      }
    });
  }

  contarFiltrosActivos(): number {
    const valores = this.filtrosForm.value;
    let count = 0;

    Object.keys(valores).forEach(key => {
      const value = valores[key];
      if (value && value !== '' && value !== false) {
        count++;
      }
    });

    if (this.tiposSeleccionados.length > 0) {
      count++;
    }

    // No contar sortBy y sortOrder como filtros activos
    if (valores.sortBy) count--;
    if (valores.sortOrder) count--;

    return count;
  }

  obtenerFiltrosActivos(): Array<{nombre: string, valor: string, campo: string}> {
    const filtros = [];
    const valores = this.filtrosForm.value;

    if (valores.dni) {
      filtros.push({nombre: 'DNI', valor: valores.dni, campo: 'dni'});
    }
    if (valores.apellidoNombre) {
      filtros.push({nombre: 'Nombre', valor: valores.apellidoNombre, campo: 'apellidoNombre'});
    }
    if (valores.estadoLicencia) {
      filtros.push({nombre: 'Estado Licencia', valor: valores.estadoLicencia, campo: 'estadoLicencia'});
    }
    if (this.tiposSeleccionados.length > 0) {
      filtros.push({nombre: 'Tipos', valor: this.tiposSeleccionados.join(', '), campo: 'tipo'});
    }
    if (valores.categoria) {
      filtros.push({nombre: 'Categoría', valor: valores.categoria, campo: 'categoria'});
    }
    if (valores.categoriaNivel) {
      filtros.push({nombre: 'Nivel', valor: valores.categoriaNivel, campo: 'categoriaNivel'});
    }

    // Filtros de edad
    if (valores.edadDesde) {
      filtros.push({nombre: 'Edad desde', valor: valores.edadDesde + ' años', campo: 'edadDesde'});
    }
    if (valores.edadHasta) {
      filtros.push({nombre: 'Edad hasta', valor: valores.edadHasta + ' años', campo: 'edadHasta'});
    }

    // Filtros de club
    if (valores.soloConClub) {
      filtros.push({nombre: 'Solo con Club', valor: 'Sí', campo: 'soloConClub'});
    }
    if (valores.clubId) {
      const club = this.opciones && this.opciones.clubes ?
        this.opciones.clubes.find(c => c.idClub == valores.clubId) : null;
      filtros.push({nombre: 'Club', valor: club?.nombre || valores.clubId, campo: 'clubId'});
    }
    if (valores.clubNombre) {
      filtros.push({nombre: 'Club (nombre)', valor: valores.clubNombre, campo: 'clubNombre'});
    }
    if (valores.estadoAfiliacionClub) {
      filtros.push({nombre: 'Estado Club', valor: valores.estadoAfiliacionClub, campo: 'estadoAfiliacionClub'});
    }

    // Filtros de pases
    if (valores.tienePases) {
      filtros.push({nombre: 'Con Pases', valor: 'Sí', campo: 'tienePases'});
    }
    if (valores.estadoPase) {
      filtros.push({nombre: 'Estado Pase', valor: valores.estadoPase, campo: 'estadoPase'});
    }
    if (valores.clubOrigenId) {
      const clubOrigen = this.opciones && this.opciones.clubesPases ?
        this.opciones.clubesPases.find(c => c.idClub == valores.clubOrigenId) : null;
      filtros.push({nombre: 'Club Origen', valor: clubOrigen?.nombre || valores.clubOrigenId, campo: 'clubOrigenId'});
    }
    if (valores.clubDestinoId) {
      const clubDestino = this.opciones && this.opciones.clubesPases ?
        this.opciones.clubesPases.find(c => c.idClub == valores.clubDestinoId) : null;
      filtros.push({nombre: 'Club Destino', valor: clubDestino?.nombre || valores.clubDestinoId, campo: 'clubDestinoId'});
    }

    // Filtros de pagos
    if (valores.tienePagos) {
      filtros.push({nombre: 'Con Pagos', valor: 'Sí', campo: 'tienePagos'});
    }
    if (valores.estadoPago) {
      filtros.push({nombre: 'Estado Pago', valor: valores.estadoPago, campo: 'estadoPago'});
    }
    if (valores.conceptoCobro) {
      filtros.push({nombre: 'Concepto Cobro', valor: valores.conceptoCobro, campo: 'conceptoCobro'});
    }

    // Filtros de credenciales
    if (valores.tieneCredencial) {
      filtros.push({nombre: 'Con Credencial', valor: 'Sí', campo: 'tieneCredencial'});
    }
    if (valores.estadoCredencial) {
      filtros.push({nombre: 'Estado Credencial', valor: valores.estadoCredencial, campo: 'estadoCredencial'});
    }

    return filtros;
  }

  eliminarFiltro(campo: string) {
    if (campo === 'tipo') {
      this.tiposSeleccionados = [];
    } else {
      this.filtrosForm.get(campo)?.setValue('');
    }
    this.aplicarFiltros();
  }
}
