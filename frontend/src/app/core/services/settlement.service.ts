import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SettlementService {
  private api = 'http://localhost:5001/api/settlements';

  constructor(private http: HttpClient) {}

  getUserSettlements(): Observable<any[]> {
    return this.http.get<any[]>(this.api);
  }

  getGroupSettlements(groupId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/group/${groupId}`);
  }

  settleUp(data: { payerId: string; payeeId: string; amount: number; groupId?: string; note?: string }): Observable<any> {
    return this.http.post(this.api, data);
  }
}
