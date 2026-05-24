import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { AppStateService } from '../../../core/services/app-state.service';
import { AuthService } from '../../../core/services/auth.service';
import { ExpenseService } from '../../../core/services/expense.service';

@Component({
  selector: 'app-friend-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './friend-details.html',
  styleUrl: './friend-details.scss',
})
export class FriendDetails implements OnInit, OnDestroy {
  friendId = '';
  friend: any = null;
  balance = 0;
  timeline: any[] = [];
  currentUser: any;
  isLoading = true;

  activeFilter: 'all' | 'expenses' | 'settlements' = 'all';
  selectedExpense: any = null;
  selectedSettlement: any = null;

  private subs = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private appState: AppStateService,
    private authService: AuthService,
    private expenseService: ExpenseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.friendId = this.route.snapshot.paramMap.get('id') || '';

    if (!this.friendId) {
      this.router.navigate(['/friends']);
      return;
    }

    this.subs.add(
      combineLatest([
        this.appState.friends$,
        this.appState.friendBalances$,
        this.appState.expenses$,
        this.appState.settlements$,
      ]).subscribe(([friends, balances, expenses, settlements]) => {
        this.friend = friends.find((f: any) => f._id === this.friendId);

        const balObj = balances.find((b: any) => b.friend._id === this.friendId);
        this.balance = balObj ? balObj.balance : 0;

        const myId = this.currentUser?._id?.toString();

        // Expenses where both me AND the friend are in splits
        const friendExp = expenses
          .filter((e: any) => {
            const ids = (e.splits || []).map((s: any) => (s.user?._id || s.user)?.toString());
            return ids.includes(myId) && ids.includes(this.friendId);
          })
          .map((e: any) => ({ ...e, kind: 'expense' }));

        // Settlements strictly between me and friend
        const friendSet = settlements
          .filter((s: any) => {
            const pId = (s.payer?._id || s.payer)?.toString();
            const eId = (s.payee?._id || s.payee)?.toString();
            return (
              (pId === myId && eId === this.friendId) ||
              (pId === this.friendId && eId === myId)
            );
          })
          .map((s: any) => ({ ...s, kind: 'settlement' }));

        this.timeline = [...friendExp, ...friendSet].sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt).getTime() -
            new Date(a.updatedAt || a.createdAt).getTime()
        );

        this.isLoading = false;
        this.cdr.detectChanges();
      })
    );
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  get filteredTimeline(): any[] {
    if (this.activeFilter === 'expenses')    return this.timeline.filter(t => t.kind === 'expense');
    if (this.activeFilter === 'settlements') return this.timeline.filter(t => t.kind === 'settlement');
    return this.timeline;
  }

  setFilter(f: 'all' | 'expenses' | 'settlements'): void { this.activeFilter = f; }

  openItem(item: any): void {
    if (item.kind === 'expense') {
      this.selectedExpense = item;
      this.selectedSettlement = null;
    } else {
      this.selectedSettlement = item;
      this.selectedExpense = null;
    }
  }

  // --- Shared helper methods (same as Activity) ---
  getMySplit(expense: any): any {
    return expense.splits?.find(
      (s: any) => (s.user?._id || s.user)?.toString() === this.currentUser?._id?.toString()
    );
  }

  getMyNet(expense: any): number {
    const s = this.getMySplit(expense);
    if (!s) return 0;
    return parseFloat((s.amountPaid - s.amountOwed).toFixed(2));
  }

  getExpenseLabel(expense: any): string {
    const net = this.getMyNet(expense);
    if (net > 0) return `you lent ₹${net.toFixed(2)}`;
    if (net < 0) return `you borrowed ₹${Math.abs(net).toFixed(2)}`;
    if (this.getMySplit(expense)) return 'settled evenly';
    return `added by ${expense.createdBy?.name}`;
  }

  getSettlementLabel(s: any): string {
    const payerId = (s.payer?._id || s.payer)?.toString();
    if (payerId === this.currentUser?._id?.toString()) {
      return `You paid ${s.payee?.name || 'someone'}`;
    }
    return `${s.payer?.name || 'Someone'} paid you`;
  }

  isPositiveForMe(item: any): boolean {
    if (item.kind === 'settlement') {
      return (item.payee?._id || item.payee)?.toString() === this.currentUser?._id?.toString();
    }
    return this.getMyNet(item) > 0;
  }

  iAmInvolved(expense: any): boolean { return !!this.getMySplit(expense); }

  isEdited(item: any): boolean {
    if (!item.updatedAt || !item.createdAt) return false;
    return new Date(item.updatedAt).getTime() > new Date(item.createdAt).getTime() + 1000;
  }

  editExpense(expense: any): void {
    if (typeof document !== 'undefined') {
      document.getElementById('closeFDExpenseModal')?.click();
    }
    this.appState.setEditingExpense(expense);
  }

  deleteExpense(id: string): void {
    if (!confirm('Delete this expense? This cannot be undone.')) return;
    this.expenseService.deleteExpense(id).subscribe({
      next: () => {
        this.selectedExpense = null;
        if (typeof document !== 'undefined') {
          document.getElementById('closeFDExpenseModal')?.click();
        }
        this.appState.refreshFinancials();
        this.cdr.detectChanges();
      },
      error: (err) => alert(err.error?.message || 'Could not delete expense.')
    });
  }

  getInitials(name: string): string {
    return (name || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  abs(n: number): number { return Math.abs(n); }
}
