import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Categoria } from '../interfaces/categoria.interface';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CategoriaService {
  private apiUrl = `${environment.apiUrl}/categorias`;


  constructor(private http: HttpClient) {}

  getCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.apiUrl);
  }

  createCategoria(data: Partial<Categoria>): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  updateCategoria(id: number, data: Partial<Categoria>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deleteCategoria(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
