import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ImgbbService {
  constructor(private http: HttpClient) {}

  /**
   * Este servicio es un wrapper para posibles operaciones adicionales directas con ImgBB.
   * Actualmente, toda la comunicación se realiza a través del backend para mantener la seguridad
   * de la API key.
   */

  // En caso de que se necesite realizar operaciones directas con ImgBB en el futuro,
  // se pueden implementar aquí métodos adicionales.
}
