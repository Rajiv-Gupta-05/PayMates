import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, combineLatest } from 'rxjs';
import { AppStateService } from '../../core/services/app-state.service';
import { ExpenseService } from '../../core/services/expense.service';
import { AuthService } from '../../core/services/auth.service';
import { CommentService } from '../../core/services/comment.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activity.html',
  styleUrl: './activity.scss',
})
export class Activity implements OnInit, OnDestroy {
  timeline: any[] = [];
  currentUser: any;
  activeFilter: 'all' | 'expenses' | 'settlements' = 'all';
  private subs = new Subscription();

  selectedExpense: any = null;
  selectedSettlement: any = null;

  comments: any[] = [];
  newCommentText = '';
  isPostingComment = false;
  isLoadingComments = false;

  constructor(
    private appState: AppStateService,
    private expenseService: ExpenseService,
    private authService: AuthService,
    private commentService: CommentService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    this.subs.add(
      combineLatest([this.appState.expenses$, this.appState.settlements$]).subscribe(
        ([expenses, settlements]) => {
          const exp = expenses.map(e => ({ ...e, kind: 'expense' }));
          const set = settlements.map(s => ({ ...s, kind: 'settlement' }));
          this.timeline = [...exp, ...set].sort(
            (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
          );
          this.cdr.detectChanges();
        }
      )
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
      this.loadComments(item._id);
    } else {
      this.selectedSettlement = item;
      this.selectedExpense = null;
    }
  }

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
    if (net > 0)  return `you lent ₹${net.toFixed(2)}`;
    if (net < 0)  return `you borrowed ₹${Math.abs(net).toFixed(2)}`;
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

  deleteExpense(id: string): void {
    if (!confirm('Delete this expense? This cannot be undone.')) return;
    this.expenseService.deleteExpense(id).subscribe({
      next: () => {
        this.selectedExpense = null;
        document.getElementById('closeExpenseDetailModal')?.click();
        this.appState.refreshFinancials();
        this.cdr.detectChanges();
      },
      error: (err) => alert(err.error?.message || 'Could not delete expense.')
    });
  }

  editExpense(expense: any): void {
    document.getElementById('closeExpenseDetailModal')?.click();
    this.appState.setEditingExpense(expense);
  }

  isEdited(item: any): boolean {
    if (!item.updatedAt || !item.createdAt) return false;
    // If updatedAt is more than 1 second after createdAt, consider it edited
    return new Date(item.updatedAt).getTime() > new Date(item.createdAt).getTime() + 1000;
  }

  getInitials(name: string): string {
    return (name || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  abs(n: number): number { return Math.abs(n); }

  loadComments(expenseId: string): void {
    this.isLoadingComments = true;
    this.comments = [];
    this.cdr.detectChanges();

    this.commentService.getComments(expenseId).subscribe({
      next: (data) => {
        this.comments = data;
        this.isLoadingComments = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Could not load comments.', 'error');
        this.isLoadingComments = false;
        this.cdr.detectChanges();
      }
    });
  }

  postComment(): void {
    if (!this.newCommentText || !this.newCommentText.trim()) return;
    if (!this.selectedExpense) return;

    this.isPostingComment = true;
    const text = this.newCommentText.trim();
    this.commentService.addComment(this.selectedExpense._id, text).subscribe({
      next: (comment) => {
        this.comments.push(comment);
        this.newCommentText = '';
        this.isPostingComment = false;
        this.toastService.show('Comment posted!', 'success');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Could not post comment.', 'error');
        this.isPostingComment = false;
        this.cdr.detectChanges();
      }
    });
  }

  deleteComment(commentId: string): void {
    if (!this.selectedExpense) return;
    if (!confirm('Are you sure you want to delete this comment?')) return;

    this.commentService.deleteComment(this.selectedExpense._id, commentId).subscribe({
      next: () => {
        this.comments = this.comments.filter(c => c._id !== commentId);
        this.toastService.show('Comment deleted.', 'success');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Could not delete comment.', 'error');
        this.cdr.detectChanges();
      }
    });
  }
}
