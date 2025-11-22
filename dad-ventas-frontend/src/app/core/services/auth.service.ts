import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthUser } from '../models/auth-user.model';
import { TokenDto } from '../models/token-dto.model';
import { jwtDecode } from 'jwt-decode';
import { isPlatformBrowser } from '@angular/common';
import { resources } from '../resources/resources';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private isBrowser: boolean;

  constructor(
      private http: HttpClient,
      @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  /**
   * Login y guarda token decodificado
   */
  login(credentials: AuthUser): Observable<TokenDto> {
    console.log('Sending login request with credentials:', credentials);
    return this.http.post<TokenDto>(resources.auth.login, credentials).pipe(
        tap((response: TokenDto) => {
          this.saveToken(response.token);
        })
    );
  }

  /**
   * Guarda el token y los datos decodificados en localStorage
   */
  saveToken(token: string): void {
    if (!this.isBrowser) return;

    localStorage.setItem('token', token);

    try {
      const decoded: any = jwtDecode(token);
      localStorage.setItem('user_name', decoded.sub || '');
      localStorage.setItem('user_role', decoded.role || '');

      // Prefer explicit clientId claim. Si no existe, como fallback usamos
      // el claim `id` solo cuando el role es CLIENTE — esto permite que
      // clientes reciban su id en `client_id` incluso si el backend no incluyó clientId.
      const clientIdFromToken = decoded.clientId ?? null;
      const fallbackId = (decoded.id && decoded.role === 'CLIENTE') ? decoded.id : null;
      const clientIdToStore = clientIdFromToken ?? fallbackId;

      if (clientIdToStore != null) {
        localStorage.setItem('client_id', clientIdToStore.toString());
        if (!clientIdFromToken && fallbackId) {
          console.warn('AuthService: clientId no encontrado en token — usando fallback id claim');
        }
      } else {
        // Asegurar que no quede un valor obsoleto
        localStorage.removeItem('client_id');
      }
    } catch (err) {
      console.error('Error al decodificar el token JWT:', err);
    }
  }

  /**
   * Devuelve el token almacenado
   */
  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem('token') : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUserName(): string | null {
    return this.isBrowser ? localStorage.getItem('user_name') : null;
  }

  getRole(): string | null {
    return this.isBrowser ? localStorage.getItem('user_role') : null;
  }

  getClientId(): number | null {
    const idStr = this.isBrowser ? localStorage.getItem('client_id') : null;
    return idStr ? Number(idStr) : null;
  }

  isAdmin(): boolean {
    return this.getRole() === 'ADMIN';
  }

  isClient(): boolean {
    return this.getRole() === 'CLIENTE';
  }

  /**
   * Genera headers de autorización con token y clientId
   */


  /**
   * Cierra sesión y limpia el almacenamiento
   */
  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem('token');
      localStorage.removeItem('user_name');
      localStorage.removeItem('user_role');
      localStorage.removeItem('client_id');
      console.log('AuthService: sesión cerrada y los datos eliminados de localStorage');
    }
  }

  /**
   * Registro de usuario
   */
  create(user: {
    userName: string;
    password: string;
    role: string;
    name: string;
    document: string;
    telefono: string;
  }): Observable<any> {
    return this.http.post(resources.auth.create, user);
  }
}
