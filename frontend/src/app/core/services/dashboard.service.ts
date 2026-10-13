import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private api = 'http://localhost:5001/api/dashboard';

  constructor(private http: HttpClient) {}

  getSummary(): Observable<any> {
    return this.http.get(`${this.api}/summary`);
  }

  getFriendBalances(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/friends`);
  }

  getGroupBalance(groupId: string): Observable<any> {
    return this.http.get(`${this.api}/group/${groupId}`);
  }
}
