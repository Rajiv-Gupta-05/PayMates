import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GroupService {
  private api = 'http://localhost:5001/api/groups';

  constructor(private http: HttpClient) {}

  getGroups(): Observable<any[]> {
    return this.http.get<any[]>(this.api);
  }

  getGroupById(id: string): Observable<any> {
    return this.http.get(`${this.api}/${id}`);
  }

  createGroup(data: { name: string; type: string; members: string[] }): Observable<any> {
    return this.http.post(this.api, data);
  }

  updateGroup(id: string, data: { name?: string; type?: string }): Observable<any> {
    return this.http.put(`${this.api}/${id}`, data);
  }

  deleteGroup(id: string): Observable<any> {
    return this.http.delete(`${this.api}/${id}`);
  }

  addMember(groupId: string, memberId: string): Observable<any> {
    return this.http.post(`${this.api}/${groupId}/members`, { memberId });
  }

  removeMember(groupId: string, memberId: string): Observable<any> {
    return this.http.delete(`${this.api}/${groupId}/members/${memberId}`);
  }
}
