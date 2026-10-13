import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';


export interface Notification {
  _id: string;
  recipient: string;
  sender: { _id: string, name: string, avatar?: string };
  type: string;
  message: string;
  entityId?: string;
  read: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://localhost:5001/api/notifications';
  
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();
  
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  fetchNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.apiUrl).pipe(
      tap(notifications => {
        this.notificationsSubject.next(notifications);
        this.updateUnreadCount(notifications);
      })
    );
  }

  markAsRead(): Observable<any> {
    return this.http.put(`${this.apiUrl}/read`, {}).pipe(
      tap(() => {
        const current = this.notificationsSubject.value;
        const updated = current.map(n => ({ ...n, read: true }));
        this.notificationsSubject.next(updated);
        this.updateUnreadCount(updated);
      })
    );
  }

  private updateUnreadCount(notifications: Notification[]) {
    const unread = notifications.filter(n => !n.read).length;
    this.unreadCountSubject.next(unread);
  }
}
