import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private api = 'http://localhost:5001/api/expenses';

  constructor(private http: HttpClient) {}

  getComments(expenseId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/${expenseId}/comments`);
  }

  addComment(expenseId: string, text: string): Observable<any> {
    return this.http.post(`${this.api}/${expenseId}/comments`, { text });
  }

  deleteComment(expenseId: string, commentId: string): Observable<any> {
    return this.http.delete(`${this.api}/${expenseId}/comments/${commentId}`);
  }
}
