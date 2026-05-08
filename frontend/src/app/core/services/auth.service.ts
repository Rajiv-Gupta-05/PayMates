import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Your Node.js backend URL
  private apiUrl = 'http://localhost:5001/api/auth';

  constructor(private http: HttpClient) {}

  // 1. Register a new user
  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData).pipe(
      tap((response: any) => {
        if (response.token) {
          this.saveToken(response.token);
        }
      })
    );
  }

  // 2. Login existing user
  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => {
        if (response.token) {
          this.saveToken(response.token);
        }
      })
    );
  }

  // 3. Save the JWT token to LocalStorage
  private saveToken(token: string): void {
    localStorage.setItem('splitwise_token', token);
  }

  // 4. Retrieve the token (we will use this later for protected routes)
  getToken(): string | null {
    return localStorage.getItem('splitwise_token');
  }

  // 5. Logout
  logout(): void {
    localStorage.removeItem('splitwise_token');
  }
}