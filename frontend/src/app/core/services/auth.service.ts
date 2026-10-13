import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:5001/api/auth';
  private platformId = inject(PLATFORM_ID);

  constructor(private http: HttpClient) {}

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData).pipe(
      tap((response: any) => {
        if (response.token) this.saveToken(response.token);
        if (response._id) this.saveUser(response);
      })
    );
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => {
        if (response.token) this.saveToken(response.token);
        if (response._id) this.saveUser(response);
      })
    );
  }

  // Verifies Google ID token on the backend and logs in / registers the user
  googleLogin(idToken: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/google`, { idToken }).pipe(
      tap((response: any) => {
        if (response.token) this.saveToken(response.token);
        if (response._id) this.saveUser(response);
      })
    );
  }

  // Returns the Google OAuth Client ID from environment config
  getGoogleClientId(): string {
    return environment.googleClientId;
  }

  private saveToken(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('splitwise_token', token);
    }
  }

  saveUser(user: any): void {
    if (isPlatformBrowser(this.platformId)) {
      const existing = this.getCurrentUser() || {};
      const updated = { ...existing, _id: user._id, name: user.name, email: user.email, phone: user.phone, avatar: user.avatar };
      localStorage.setItem('splitwise_user', JSON.stringify(updated));
    }
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('splitwise_token');
    }
    return null;
  }

  getCurrentUser(): any {
    if (isPlatformBrowser(this.platformId)) {
      const u = localStorage.getItem('splitwise_user');
      return u ? JSON.parse(u) : null;
    }
    return null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('splitwise_token');
      localStorage.removeItem('splitwise_user');
    }
  }
}