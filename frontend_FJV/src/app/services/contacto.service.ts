import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Contacto } from '../interfaces/contacto.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ContactoService {
  private baseUrl = `${environment.apiUrl}/contacto`;

  constructor(private http: HttpClient) {}

  obtenerContacto(): Observable<Contacto> {
    return this.http.get<Contacto>(this.baseUrl);
  }

  actualizarContacto(contacto: Contacto): Observable<any> {
    return this.http.put(this.baseUrl, contacto);
  }

  crearContacto(contacto: Contacto): Observable<any> {
  return this.http.post(this.baseUrl, contacto);
}

}
