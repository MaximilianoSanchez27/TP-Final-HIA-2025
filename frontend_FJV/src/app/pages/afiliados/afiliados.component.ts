import { Component, OnInit } from '@angular/core';
import { Afiliado } from '../../interfaces/afiliado.interface';
import { Club } from '../../interfaces/club.interface';
import { AfiliadoService, FiltrosAvanzados, ResultadoFiltrosAvanzados } from '../../services/afiliado.service';
import { Observable, BehaviorSubject, switchMap, map } from 'rxjs';
import { FormularioAfiliadoComponent } from './components/Formulario/formulario-afiliado.component';
import { BuscadorAfiliadosComponent } from './components/Buscador/buscador-afiliado.component';
import { ListadoAfiliadosComponent } from './components/Listado/listado-afiliados.component';
import { FiltrosAvanzadosComponent } from './components/filtros-avanzados/filtros-avanzados.component';
import { AsyncPipe, CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Router, RouterModule } from '@angular/router';
import { ListadoClubesComponent } from '../clubs/components/listado-clubes/listado-clubes.component';

@Component({
    selector: 'app-afiliados',
    templateUrl: './afiliados.component.html',
    styleUrls: ['./afiliados.component.css'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        BuscadorAfiliadosComponent,
        ListadoAfiliadosComponent,
        FiltrosAvanzadosComponent,
        RouterModule
    ],
})
export class AfiliadosComponent implements OnInit {
    afiliados: Afiliado[] = [];
    clubes$!: Observable<Club[]>;
    clubesNombres: string[] = [];
    clubesCompletos: Club[] = [];

    // Nuevas propiedades para filtros avanzados
    resultadoFiltros: ResultadoFiltrosAvanzados | null = null;
    filtrosActivos: FiltrosAvanzados = {};
    cargandoAfiliados = false;
    estadisticas: any = null;
    mostrarFiltrosAvanzados = false;

    private filtrosBusqueda$ = new BehaviorSubject<{ dni?: string; apellidoNombre?: string }>({});

    afiliadoParaEditar: Afiliado | null = null;

    constructor(
      private afiliadoService: AfiliadoService,
      private modalService: NgbModal,
      private router: Router
    ) {}

    ngOnInit(): void {
        this.loadClubes();
        this.cargarAfiliadosIniciales();
        this.actualizarEstadosLicencias();
    }

    // Método para cargar afiliados iniciales (sin filtros)
    private cargarAfiliadosIniciales(): void {
        this.cargandoAfiliados = true;
        this.afiliadoService.obtenerAfiliadosConFiltros({}).subscribe({
            next: (resultado) => {
                this.resultadoFiltros = resultado;
                this.afiliados = resultado.afiliados;
                this.estadisticas = resultado.estadisticas;
                this.cargandoAfiliados = false;
            },
            error: (error) => {
                console.error('Error cargando afiliados:', error);
                this.cargandoAfiliados = false;
            }
        });
    }

    // Nueva función para cargar los clubes
    private loadClubes(): void {
        this.clubes$ = this.afiliadoService.obtenerClubes();
        this.clubes$.subscribe(data => {
            this.clubesCompletos = data;
            this.clubesNombres = data.map(club => club.nombre);
        });
    }

    private normalizeText(text: string | undefined | null): string {
        if (!text) return '';
        return text
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }

    // Método actualizado para búsqueda básica (mantener compatibilidad)
    onBuscarAfiliado(filtros: { dni?: string; apellidoNombre?: string }) {
        const filtrosAvanzados: FiltrosAvanzados = {
            dni: filtros.dni,
            apellidoNombre: filtros.apellidoNombre,
            page: 1,
            limit: 50
        };
        this.aplicarFiltrosAvanzados(filtrosAvanzados);
    }

    // Nuevo método para filtros avanzados
    aplicarFiltrosAvanzados(filtros: FiltrosAvanzados): void {
        this.cargandoAfiliados = true;
        this.filtrosActivos = filtros;

        this.afiliadoService.obtenerAfiliadosConFiltros(filtros).subscribe({
            next: (resultado) => {
                this.resultadoFiltros = resultado;
                this.afiliados = resultado.afiliados;

                // Si tenemos estadísticas, usarlas, de lo contrario crear un objeto básico
                if (resultado.estadisticas) {
                    this.estadisticas = resultado.estadisticas;
                } else {
                    this.estadisticas = {
                        totalAfiliados: resultado.afiliados.length,
                        afiliadosActivos: resultado.afiliados.filter(a => a.estadoLicencia === 'ACTIVO').length,
                        afiliadosInactivos: resultado.afiliados.filter(a => a.estadoLicencia !== 'ACTIVO').length,
                        totalPases: 0,
                        porcentajeActivos: resultado.afiliados.length > 0
                            ? Math.round((resultado.afiliados.filter(a => a.estadoLicencia === 'ACTIVO').length / resultado.afiliados.length) * 100)
                            : 0
                    };
                }

                this.cargandoAfiliados = false;
            },
            error: (error) => {
                console.error('Error aplicando filtros:', error);
                this.cargandoAfiliados = false;

                // En caso de error, limpiar los resultados pero mantener los afiliados actuales
                // para que el usuario pueda seguir viendo datos
                alert('Error al aplicar filtros. Por favor intente nuevamente.');
            }
        });
    }

    // Método para exportar a Excel
    exportarExcel(filtros: FiltrosAvanzados): void {
        this.afiliadoService.exportarAfiliadosExcel(filtros).subscribe({
            next: (blob) => {
                const fechaActual = new Date().toISOString().split('T')[0];
                this.afiliadoService.descargarExcel(blob, `afiliados_filtrados_${fechaActual}.xlsx`);
            },
            error: (error) => {
                console.error('Error exportando Excel:', error);
                alert('Error al exportar el archivo Excel');
            }
        });
    }

    // Método para cambiar página
    cambiarPagina(pagina: number): void {
        const filtrosConPagina = {
            ...this.filtrosActivos,
            page: pagina
        };
        this.aplicarFiltrosAvanzados(filtrosConPagina);
    }

    onEliminarAfiliado(idPersona: number) {
        if (confirm('¿Estás seguro de que deseas eliminar este afiliado?')) {
            this.afiliadoService.eliminarAfiliado(idPersona).subscribe({
                next: () => {
                    console.log('Afiliado eliminado con éxito');
                    // Recargar con los filtros actuales
                    this.aplicarFiltrosAvanzados(this.filtrosActivos);
                },
                error: (err) => console.error('Error al eliminar afiliado:', err)
            });
        }
    }

    onEditarAfiliado(afiliado: Afiliado) {
        this.router.navigate(['/afiliados/editar', afiliado.idPersona]);
    }

    onVerDetalleAfiliado(afiliado: Afiliado) {
        console.log('Navegando a detalle de afiliado:', afiliado);
        if (afiliado.idPersona) {
            this.router.navigate(['/afiliados/detalle', afiliado.idPersona]);
        } else {
            console.error('El afiliado no tiene ID de persona:', afiliado);
            alert('Error: No se puede mostrar el detalle del afiliado');
        }
    }

    onEditarCategorias(tipo: 'categoria1' | 'categoria2' | 'categoria3'): void {
        console.log('Editar categorías:', tipo);
        // Aquí podrías abrir un modal o navegar a una página de edición
        // Por ejemplo, podrías usar NgbModal para abrir un modal de edición
    }

    // Modificar este método para abrir el CRUD de Clubes en un modal
    onEditarClubes(): void {
        console.log('Abriendo CRUD de clubes...');
        this.modalService.open(ListadoClubesComponent, { size: 'xl', backdrop: 'static', keyboard: false })
            .result.then((result) => {
                // Se cerró el modal de clubes. Recargar los clubes en el formulario de afiliados
                this.loadClubes();
                console.log('CRUD de clubes cerrado:', result);
            }, (reason) => {
                // Modal de clubes cerrado sin guardar (ej. por escape o botón de cerrar)
                this.loadClubes();
                console.log('CRUD de clubes descartado:', reason);
            });
    }

    // Método para alternar filtros avanzados
    toggleFiltrosAvanzados(): void {
        this.mostrarFiltrosAvanzados = !this.mostrarFiltrosAvanzados;
    }

    // Método para limpiar todos los filtros
    limpiarTodosFiltros(): void {
        this.filtrosActivos = {};
        this.cargarAfiliadosIniciales();
    }

    // Nuevo método para actualizar estados de licencias
    private actualizarEstadosLicencias(): void {
        console.log('Función de actualizar estados no disponible');
    }

    // Getters para el template
    get totalAfiliados(): number {
        return this.resultadoFiltros?.totalRegistros || 0;
    }

    get totalPaginas(): number {
        return this.resultadoFiltros?.totalPaginas || 1;
    }

    get paginaActual(): number {
        return this.resultadoFiltros?.paginaActual || 1;
    }

    get hayFiltrosActivos(): boolean {
        return Object.keys(this.filtrosActivos).length > 2; // Más que solo page y limit
    }

    get textoPaginacion(): string {
        if (!this.resultadoFiltros) return '';

        const inicio = ((this.paginaActual - 1) * this.resultadoFiltros.registrosPorPagina) + 1;
        const fin = Math.min(this.paginaActual * this.resultadoFiltros.registrosPorPagina, this.totalAfiliados);

        return `Mostrando ${inicio}-${fin} de ${this.totalAfiliados} afiliados`;
    }
}
