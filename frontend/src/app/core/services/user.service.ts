import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
  private api = 'http://localhost:5001/api/users';

  constructor(private http: HttpClient) {}

  getProfile(): Observable<any> {
    return this.http.get(`${this.api}/me`);
  }

  searchUsers(query: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}?search=${query}`);
  }

  getFriends(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/friends`);
  }

  addFriend(friendId: string): Observable<any> {
    return this.http.post(`${this.api}/add-friend`, { friendId });
  }

  removeFriend(friendId: string): Observable<any> {
    return this.http.delete(`${this.api}/friends/${friendId}`);
  }
}
