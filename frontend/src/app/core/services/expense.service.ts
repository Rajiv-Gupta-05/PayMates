import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private api = 'http://localhost:5001/api/expenses';

  constructor(private http: HttpClient) {}

  getUserExpenses(): Observable<any[]> {
    return this.http.get<any[]>(this.api);
  }

  getGroupExpenses(groupId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/group/${groupId}`);
  }

  getExpenseById(id: string): Observable<any> {
    return this.http.get(`${this.api}/${id}`);
  }

  createExpense(data: any): Observable<any> {
    return this.http.post(this.api, data);
  }

  deleteExpense(id: string): Observable<any> {
    return this.http.delete(`${this.api}/${id}`);
  }
}
