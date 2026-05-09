import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { AddExpense } from '../add-expense/add-expense';
import { AuthService } from '../../../core/services/auth.service';
import { AppStateService } from '../../../core/services/app-state.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, AsyncPipe, AddExpense],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout implements OnInit {
  currentUser: any = null;

  // ✅ Expose observable directly — use async pipe in template to avoid NG0100
  isLoading$: Observable<boolean>;

  constructor(
    private authService: AuthService,
    private appState: AppStateService,
    private router: Router
  ) {
    this.isLoading$ = this.appState.isLoading$;
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    // Single parallel load — all components subscribe to AppState, no individual HTTP calls
    this.appState.loadAll();
  }

  getInitials(): string {
    if (!this.currentUser?.name) return '?';
    return this.currentUser.name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  logout(): void {
    this.appState.reset();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
