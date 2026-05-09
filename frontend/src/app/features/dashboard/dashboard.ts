import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AppStateService } from '../../core/services/app-state.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  summary: any = { totalBalance: 0, youOwe: 0, youAreOwed: 0 };
  friendBalances: any[] = [];
  currentUser: any = null;
  private subs = new Subscription();

  constructor(
    private appState: AppStateService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef   // ← Fix #1: force change detection
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    this.subs.add(
      this.appState.summary$.subscribe(s => {
        if (s) { this.summary = s; this.cdr.detectChanges(); }
      })
    );
    this.subs.add(
      this.appState.friendBalances$.subscribe(fb => {
        this.friendBalances = fb; this.cdr.detectChanges();
      })
    );
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  get oweList(): any[]  { return this.friendBalances.filter(f => f.balance < 0); }
  get owedList(): any[] { return this.friendBalances.filter(f => f.balance > 0); }

  getInitials(name: string): string {
    return (name || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }
  abs(n: number): number { return Math.abs(n); }
}
