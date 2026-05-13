import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { AppStateService } from '../../core/services/app-state.service';
import { AuthService } from '../../core/services/auth.service';
import { SettlementService } from '../../core/services/settlement.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  summary: any = { totalBalance: 0, youOwe: 0, youAreOwed: 0 };
  friendBalances: any[] = [];
  currentUser: any = null;
  private subs = new Subscription();

  // Settle up
  settleFriend: any = null;
  settleAmount = '';
  settleNote = '';
  settleError = '';
  isSettling = false;
  isDropdownOpen = false;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (this.isDropdownOpen && !target.closest('.settle-dropdown')) {
      this.isDropdownOpen = false;
    }
  }

  constructor(
    private appState: AppStateService,
    private authService: AuthService,
    private settlementService: SettlementService,
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

  // ── Settle Up ─────────────────────────────────────────────────────
  initGlobalSettle(): void {
    this.settleFriend = null;
    this.settleAmount = '';
    this.settleNote = '';
    this.settleError = '';
    this.isDropdownOpen = false;
  }

  selectFriend(friend: any): void {
    this.settleFriend = friend;
    this.isDropdownOpen = false;
    this.onSettleFriendChange();
  }

  onSettleFriendChange(): void {
    if (this.settleFriend) {
      const balance = this.getBalance(this.settleFriend._id);
      this.settleAmount = this.abs(balance).toString();
    } else {
      this.settleAmount = '';
    }
  }

  getBalance(friendId: string): number {
    return this.friendBalances.find(f => f.friend._id === friendId)?.balance || 0;
  }

  settleUp(): void {
    const amount = parseFloat(this.settleAmount);
    if (!amount || amount <= 0) { this.settleError = 'Enter a valid positive amount.'; return; }
    this.isSettling = true;
    this.settleError = '';

    const balance = this.friendBalances.find(f => f.friend._id === this.settleFriend._id)?.balance || 0;
    // balance < 0 → current user owes friend → user is the payer
    const payerId = balance < 0 ? this.currentUser._id : this.settleFriend._id;
    const payeeId = balance < 0 ? this.settleFriend._id : this.currentUser._id;

    this.settlementService.settleUp({ payerId, payeeId, amount, note: this.settleNote }).subscribe({
      next: () => {
        this.isSettling = false;
        this.settleFriend = null;
        document.getElementById('closeDashboardSettleModal')?.click();
        this.appState.refreshFinancials();
        this.appState.refreshFriends();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSettling = false;
        this.settleError = err.error?.message || 'Failed to record settlement.';
        this.cdr.detectChanges();
      }
    });
  }

  getInitials(name: string): string {
    return (name || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }
  abs(n: number): number { return Math.abs(n); }
}
