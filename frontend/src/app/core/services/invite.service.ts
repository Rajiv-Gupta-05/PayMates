import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InvitePayload {
  type: 'email';
  value: string;
  message?: string;
}

export interface InviteResponse {
  success: boolean;
  message: string;
  previewUrl?: string;
  note?: string;
}

@Injectable({ providedIn: 'root' })
export class InviteService {
  private api = 'http://localhost:5001/api/invite';

  constructor(private http: HttpClient) {}

  sendInvite(payload: InvitePayload): Observable<InviteResponse> {
    return this.http.post<InviteResponse>(this.api, payload);
  }
}
