import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, switchMap, tap, timeout, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  Noticia,
  PaginacionResponse,
  CategoriaOption,
  NoticiasParams,
  NoticiaResponse
} from '../models/noticia.model';

@Injectable({
  providedIn: 'root'
})
export class NoticiaService {
  private apiUrl = `${environment.apiUrl}/noticias`;

  constructor(private http: HttpClient) {}

  // Obtener noticias con paginación y filtros
  getNoticias(params?: NoticiasParams): Observable<PaginacionResponse<Noticia>> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.estado) httpParams = httpParams.set('estado', params.estado);
      if (params.categoria) httpParams = httpParams.set('categoria', params.categoria);
      if (params.destacado !== undefined) httpParams = httpParams.set('destacado', params.destacado.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.buscar) httpParams = httpParams.set('buscar', params.buscar);
    }

    return this.http.get<PaginacionResponse<Noticia>>(this.apiUrl, { params: httpParams });
  }

  // Obtener noticia por ID
  getNoticia(id: number): Observable<NoticiaResponse> {
    return this.http.get<NoticiaResponse>(`${this.apiUrl}/${id}`);
  }

  // Método para buscar noticias por URL (implementado LOCALMENTE sin llamar al endpoint)
  buscarPorUrl(categoria: string, slug: string): Observable<NoticiaResponse> {
    // Buscar todas las noticias activas de esa categoría
    return this.getNoticias({
      estado: 'ACTIVO',
      limit: 100 
    }).pipe(
      map(response => {
        if (response.noticias.length === 0) {
          console.log('No se encontraron noticias activas en la base de datos');
          throw new Error('No se encontraron noticias');
        }

        let noticia = null;

        // Primero intentamos filtrar por categoría si se especificó
        let noticiasFiltered = response.noticias;
        if (categoria && categoria !== 'ver') {
          noticiasFiltered = response.noticias.filter(
            n => n.categoria.toLowerCase() === categoria.toLowerCase()
          );
        }

        // Si no hay noticias en esta categoría, pero hay otras noticias, usar todas
        if (noticiasFiltered.length === 0) {
          console.log(`No hay noticias en la categoría "${categoria}", usando todas las noticias disponibles`);
          noticiasFiltered = response.noticias;
        }

        // Normalizar el slug para comparación
        const normalizedSlug = slug.toLowerCase();

        // 1. Intentar encontrar coincidencia exacta por slug o ID
        // Primero comprobar si es un ID
        if (!isNaN(Number(slug))) {
          noticia = noticiasFiltered.find(n => n.idNoticia === Number(slug));
          if (noticia) {
            console.log(`Noticia encontrada por ID: ${noticia.idNoticia}`);
            return {
              status: "1",
              noticia: noticia,
              alternativa: false
            };
          }
        }

        // Luego buscar por slug exacto
        noticia = noticiasFiltered.find(n =>
          (n.slug && n.slug.toLowerCase() === normalizedSlug) ||
          this.generateSlug(n.titulo) === normalizedSlug
        );

        if (noticia) {
          console.log(`Noticia encontrada por slug exacto: ${noticia.titulo}`);
          return {
            status: "1",
            noticia: noticia,
            alternativa: categoria !== noticia.categoria.toLowerCase()
          };
        }

        // 2. Si no hay coincidencia exacta, intentar buscar coincidencia parcial en título o slug
        noticia = noticiasFiltered.find(n => {
          const tituloSlug = this.generateSlug(n.titulo);
          return n.titulo.toLowerCase().includes(normalizedSlug) ||
                 (normalizedSlug.length > 3 && tituloSlug.includes(normalizedSlug)) ||
                 (n.slug && n.slug.toLowerCase().includes(normalizedSlug));
        });

        if (noticia) {
          console.log(`Noticia encontrada por coincidencia parcial: ${noticia.titulo}`);
          return {
            status: "1",
            noticia: noticia,
            alternativa: true
          };
        }

        // 3. Si aún no hay resultados, devolver la noticia más reciente como alternativa
        if (noticiasFiltered.length > 0) {
          console.log('No se encontró coincidencia, retornando noticia más reciente como alternativa');
          return {
            status: "1",
            noticia: noticiasFiltered[0],
            alternativa: true
          };
        }

        throw new Error('No se encontró ninguna noticia que coincida con los criterios');
      }),
      catchError(error => {
        console.error('Error buscando noticia por URL:', error);

        // Si el slug parece ser un ID, intentar cargar directamente por ID como último recurso
        if (!isNaN(Number(slug))) {
          console.log('Intentando buscar por ID como último recurso:', slug);
          return this.getNoticia(Number(slug)).pipe(
            map(response => {
              // Asegurarnos de que la respuesta incluya la propiedad alternativa
              return {
                ...response,
                alternativa: true
              };
            }),
            catchError(idError => {
              console.error('Error buscando por ID:', idError);
              return throwError(() => new Error('No se encontró ninguna noticia'));
            })
          );
        }

        return throwError(() => new Error('No se encontró ninguna noticia'));
      })
    );
  }

  // Obtener categorías disponibles
  getCategorias(): Observable<{status: string, categorias: CategoriaOption[]}> {
    return this.http.get<{status: string, categorias: CategoriaOption[]}>(`${this.apiUrl}/categorias`);
  }

  // Verificar si un slug ya existe - mejorado para usar endpoint específico cuando esté disponible
  verificarSlug(slug: string): Observable<{existe: boolean}> {
    return this.getNoticias({
      estado: 'ACTIVO',
      limit: 200 
    }).pipe(
      map(response => {
        // Verificar si alguna noticia tiene el mismo slug
        const existe = response.noticias.some(noticia =>
          noticia.slug === slug || this.generateSlug(noticia.titulo) === slug
        );

        return { existe };
      })
    );
  }

  // Método para generar un slug en el backend - mejorado para manejar la respuesta correctamente
  generarSlugBackend(texto: string): Observable<{slug: string, tituloOriginal: string}> {
    // Usar el endpoint dedicado del backend
    return this.http.get<{status: string, slug: string, tituloOriginal: string}>(`${this.apiUrl}/generar-slug`, {
      params: { titulo: texto }
    }).pipe(
      map(response => {
        console.log('Slug generado por el backend:', response.slug);
        return {
          slug: response.slug,
          tituloOriginal: response.tituloOriginal
        };
      }),
      catchError(error => {
        console.error('Error al generar slug en el backend:', error);
        return of({
          slug: this.generateSlug(texto),
          tituloOriginal: texto
        });
      })
    );
  }

  // Crear noticia - asegurarse que siempre tenga un slug válido
  crearNoticia(noticia: Noticia): Observable<{status: string, msg: string, noticia: Noticia}> {
    // Asegurarnos que la noticia tiene un slug
    if (!noticia.slug && noticia.titulo) {
      console.log('Generando slug para nueva noticia:', noticia.titulo);

      // Primero intentamos usar el endpoint específico para generar slugs
      return this.generarSlugBackend(noticia.titulo).pipe(
        catchError(error => {
          console.warn('Error al generar slug desde backend:', error);
          return of({
            slug: this.generateSlug(noticia.titulo),
            tituloOriginal: noticia.titulo
          });
        }),
        switchMap(slugInfo => {
          noticia.slug = slugInfo.slug;
          console.log('Slug generado:', noticia.slug);

          // Verificamos si el slug ya existe
          return this.verificarSlug(noticia.slug).pipe(
            switchMap(resultado => {
              if (resultado.existe) {
                const timestamp = new Date().getTime().toString().slice(-4);
                noticia.slug = `${noticia.slug}-${timestamp}`;
                console.log('Slug modificado para evitar duplicados:', noticia.slug);
              }

              // Crear la noticia con el slug generado
              return this.http.post<{status: string, msg: string, noticia: Noticia}>(this.apiUrl, noticia);
            })
          );
        })
      );
    }

    if (noticia.slug) {
      return this.verificarSlug(noticia.slug).pipe(
        switchMap(resultado => {
          if (resultado.existe) {
            console.log('Slug existente, generando uno único');
            const timestamp = new Date().getTime().toString().slice(-4);
            noticia.slug = `${noticia.slug}-${timestamp}`;
          }

          return this.http.post<{status: string, msg: string, noticia: Noticia}>(this.apiUrl, noticia);
        })
      );
    }

    console.warn('Intentando crear noticia sin título ni slug');
    return this.http.post<{status: string, msg: string, noticia: Noticia}>(this.apiUrl, noticia);
  }

  // Actualizar noticia 
  actualizarNoticia(id: number, noticia: Partial<Noticia>): Observable<{status: string, msg: string, noticia: Noticia}> {
    // Si se modificó el título o se indica explícitamente que se actualice el slug
    if (noticia.titulo || noticia.actualizarSlug) {
      console.log('Regenerando slug para noticia con título:', noticia.titulo);

      if (noticia.titulo) {
        return this.generarSlugBackend(noticia.titulo).pipe(
          catchError(error => {
            console.warn('Error al generar slug desde backend:', error);
            return of({
              slug: this.generateSlug(noticia.titulo!),
              tituloOriginal: noticia.titulo!
            });
          }),
          switchMap(slugInfo => {
            noticia.slug = slugInfo.slug;
            console.log('Slug generado:', noticia.slug);
            return this.getNoticias({ estado: 'ACTIVO', limit: 200 }).pipe(
              map(response => {
                // Verificar duplicados excluyendo esta noticia
                const slugDuplicado = response.noticias.some(n =>
                  n.idNoticia !== id &&
                  (n.slug === noticia.slug || this.generateSlug(n.titulo) === noticia.slug)
                );

                if (slugDuplicado) {
                  console.log('Slug duplicado detectado, generando slug único');
                  const timestamp = new Date().getTime().toString().slice(-4);
                  noticia.slug = `${noticia.slug}-${timestamp}`;
                }

                return noticia;
              }),
              switchMap(noticiaActualizada => {

                noticiaActualizada.actualizarSlug = true;

                console.log('Enviando actualización al backend con slug:', noticiaActualizada.slug);
                return this.http.put<{status: string, msg: string, noticia: Noticia}>(
                  `${this.apiUrl}/${id}`, noticiaActualizada
                ).pipe(
                  tap(response => {
                    if (response.noticia.slug !== noticiaActualizada.slug) {
                      console.log('Nota: El backend modificó el slug enviado.', {
                        enviadoPorFrontend: noticiaActualizada.slug,
                        devueltoPorBackend: response.noticia.slug
                      });
                    }
                  })
                );
              })
            );
          })
        );
      } else {
        // Si no hay título nuevo pero se solicita actualizar el slug,
        // simplemente marcamos la flag y enviamos la actualización
        noticia.actualizarSlug = true;
        return this.http.put<{status: string, msg: string, noticia: Noticia}>(
          `${this.apiUrl}/${id}`, noticia
        );
      }
    }

    // Si no se modificó el título, simplemente actualizamos la noticia sin cambiar el slug
    return this.http.put<{status: string, msg: string, noticia: Noticia}>(
      `${this.apiUrl}/${id}`, noticia
    );
  }

  // Eliminar noticia (solo admin)
  eliminarNoticia(id: number): Observable<{status: string, msg: string}> {
    return this.http.delete<{status: string, msg: string}>(`${this.apiUrl}/${id}`);
  }

  // Cambiar estado de noticia (solo admin)
  cambiarEstado(id: number, estado: 'ACTIVO' | 'INACTIVO' | 'BORRADOR'): Observable<NoticiaResponse> {
    // Usar el endpoint de actualización general en lugar del específico
    return this.http.put<NoticiaResponse>(`${this.apiUrl}/${id}`, { estado });
  }

  // Obtener estadísticas (solo admin)
  getEstadisticas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/estadisticas`)
      .pipe(
        timeout(15000),
        retry(1),       
        catchError(error => {
          console.error('Error al obtener estadísticas:', error);

          // Log detallado para facilitar la depuración
          if (error.status) {
            console.log(`Error HTTP ${error.status}: ${error.statusText}`);
          }

          if (error.error) {
            console.log('Detalle del error:', error.error);
          }

          // Personalizar mensaje según tipo de error
          let errorMessage = 'Error al cargar las estadísticas';

          if (error.status === 401 || error.status === 403) {
            errorMessage = 'No tienes permiso para acceder a estas estadísticas';
          } else if (error.status === 404) {
            errorMessage = 'El endpoint de estadísticas no está disponible';
          } else if (error.status === 0) {
            errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet';
          }

          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // Generar slug a partir de un título localmente - mejorado para manejar títulos largos
  generateSlug(texto: string): string {
    if (!texto) return '';

    return texto
      .toLowerCase()
      .normalize('NFD')  
      .replace(/[\u0300-\u036f]/g, '') 
      .replace(/[^\w\s-]/g, '')  
      .replace(/\s+/g, '-')  
      .replace(/-+/g, '-')  
      .replace(/^-+|-+$/g, '') 
      .trim(); 
  }

  // Método para generar slugs únicos
  generateUniqueSlug(texto: string, id?: number): Observable<string> {
    const baseSlug = this.generateSlug(texto);

    // Verificar si el slug ya existe
    return this.verificarSlug(baseSlug).pipe(
      map(resultado => {
        if (!resultado.existe) {
          return baseSlug;
        }

        // Si ya existe, generar uno único con timestamp
        const timestamp = new Date().getTime().toString().slice(-4);
        return `${baseSlug}-${timestamp}`;
      })
    );
  }

  // Método para obtener URL amigable de una noticia
  getNoticiaUrl(noticia: Noticia): string {
    if (noticia.idNoticia) {
      // Generar slug a partir del título si no existe
      const slug = noticia.slug || this.generateSlug(noticia.titulo);

      // Retornar URL amigable con categoría y slug
      return `/noticias/${noticia.categoria.toLowerCase()}/${slug}`;
    } else {
      // Fallback si no hay ID
      return '/noticias';
    }
  }
}
