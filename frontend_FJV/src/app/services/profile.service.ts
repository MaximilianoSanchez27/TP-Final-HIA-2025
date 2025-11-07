import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService, User } from './auth.service'; 
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = `${environment.apiUrl}/profile`; 

  constructor(private http: HttpClient, private authService: AuthService) { }

  getProfile(): Observable<User> {
    // Obtenemos el token para autenticar la petición
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<User>(this.apiUrl, { headers });
  }

  updateProfile(formData: FormData): Observable<any> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.put(this.apiUrl, formData, { headers });
  }
}
