import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription, forkJoin } from 'rxjs';
import { AppStateService } from '../../core/services/app-state.service';
import { GroupService } from '../../core/services/group.service';
import { UserService } from '../../core/services/user.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { ExpenseService } from '../../core/services/expense.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './groups.html',
  styleUrl: './groups.scss',
})
export class Groups implements OnInit, OnDestroy {
  groups: any[] = [];
  groupDetailCache = new Map<string, any>();  // Map prevents falsy-0 cache-miss
  currentUser: any;
  private subs = new Subscription();

  // Create Group Modal
  createForm: FormGroup;
  isCreating = false;
  createError = '';
  friendSearchQuery = '';
  friendResults: any[] = [];
  selectedFriends: any[] = [];

  // Group Detail Modal
  selectedGroup: any = null;
  groupDetail: any = null;
  groupExpenses: any[] = [];
  isLoadingDetail = false;
  detailError = '';

  // Expense detail drill-down inside group modal
  selectedExpense: any = null;

  readonly GROUP_TYPES = ['TRIP', 'HOME', 'COUPLE', 'OTHER'];
  readonly GROUP_EMOJIS: { [key: string]: string } = {
    TRIP: '🏖️', HOME: '🏠', COUPLE: '💑', OTHER: '👥'
  };
  readonly GROUP_COLORS: { [key: string]: string } = {
    TRIP: 'linear-gradient(135deg,#ff9a9e,#fecfef)',
    HOME: 'linear-gradient(135deg,#a1c4fd,#c2e9fb)',
    COUPLE: 'linear-gradient(135deg,#fd79a8,#e17055)',
    OTHER: 'linear-gradient(135deg,#00ffcc,#007bff)',
  };

  constructor(
    private appState: AppStateService,
    private groupService: GroupService,
    private userService: UserService,
    private dashboardService: DashboardService,
    private expenseService: ExpenseService,
    private authService: AuthService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      type: ['OTHER', Validators.required]
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.subs.add(this.appState.groups$.subscribe(g => {
      this.groups = g;
      this.cdr.detectChanges();
    }));
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  getEmoji(type: string): string { return this.GROUP_EMOJIS[type] || '👥'; }
  getColor(type: string): string { return this.GROUP_COLORS[type] || this.GROUP_COLORS['OTHER']; }
  abs(n: number): number { return Math.abs(n); }

  getGroupBalance(groupId: string): number | null {
    if (!this.groupDetailCache.has(groupId)) return null;
    return this.groupDetailCache.get(groupId)?.balance?.yourBalance ?? 0;
  }

  // ── Friend Search ─────────────────────────────────────────────────
  searchFriends(): void {
    if (this.friendSearchQuery.trim().length < 2) { this.friendResults = []; return; }
    this.userService.searchUsers(this.friendSearchQuery).subscribe({
      next: (users) => {
        this.friendResults = users.filter(u =>
          u._id !== this.currentUser?._id &&
          !this.selectedFriends.find(f => f._id === u._id)
        );
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  addToSelected(user: any): void {
    if (!this.selectedFriends.find(f => f._id === user._id)) {
      this.selectedFriends.push(user);
    }
    this.friendResults = [];
    this.friendSearchQuery = '';
  }

  removeFromSelected(userId: string): void {
    this.selectedFriends = this.selectedFriends.filter(f => f._id !== userId);
  }

  // ── Create Group ──────────────────────────────────────────────────
  createGroup(): void {
    if (this.createForm.invalid) return;
    this.isCreating = true;
    this.createError = '';

    const payload = {
      name: this.createForm.value.name,
      type: this.createForm.value.type,
      members: this.selectedFriends.map(f => f._id)
    };

    this.groupService.createGroup(payload).subscribe({
      next: () => {
        this.isCreating = false;
        this.createForm.reset({ name: '', type: 'OTHER' });
        this.selectedFriends = [];
        this.friendSearchQuery = '';
        document.getElementById('closeCreateGroupModal')?.click();
        this.appState.refreshGroups();
        this.appState.refreshFriends();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isCreating = false;
        this.createError = err.error?.message || 'Failed to create group.';
        this.cdr.detectChanges();
      }
    });
  }

  // ── View Group Detail ─────────────────────────────────────────────
  viewGroup(group: any): void {
    this.selectedGroup = group;
    this.detailError = '';
    this.selectedExpense = null;

    // Use Map.has() — covers case where yourBalance=0 (falsy)
    if (this.groupDetailCache.has(group._id)) {
      const cached = this.groupDetailCache.get(group._id);
      this.groupDetail = cached.balance;
      this.groupExpenses = cached.expenses;
      this.isLoadingDetail = false;
      return;
    }

    this.isLoadingDetail = true;
    this.groupDetail = null;
    this.groupExpenses = [];

    // Fetch balance summary AND expenses in parallel
    forkJoin({
      balance: this.dashboardService.getGroupBalance(group._id),
      expenses: this.expenseService.getGroupExpenses(group._id)
    }).subscribe({
      next: ({ balance, expenses }) => {
        this.groupDetailCache.set(group._id, { balance, expenses });
        this.groupDetail = balance;
        this.groupExpenses = expenses;
        this.isLoadingDetail = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoadingDetail = false;
        this.detailError = err.error?.message || 'Failed to load group details.';
        this.cdr.detectChanges();
      }
    });
  }

  // Force refresh of a group's detail (after adding expense)
  refreshGroupDetail(groupId: string): void {
    this.groupDetailCache.delete(groupId);
    if (this.selectedGroup?._id === groupId) {
      this.viewGroup(this.selectedGroup);
    }
  }

  // ── Expense detail inside group modal ────────────────────────────
  openExpense(expense: any): void { this.selectedExpense = expense; }
  closeExpense(): void { this.selectedExpense = null; }

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

  // ── Delete Group ──────────────────────────────────────────────────
  deleteGroup(groupId: string): void {
    if (!confirm('Delete this group? All associated expenses will remain.')) return;
    this.groupService.deleteGroup(groupId).subscribe({
      next: () => {
        this.groupDetailCache.delete(groupId);
        this.selectedGroup = null;
        this.groupDetail = null;
        this.groupExpenses = [];
        document.getElementById('closeGroupDetailModal')?.click();
        this.appState.refreshGroups();
        this.cdr.detectChanges();
      },
      error: (err) => alert(err.error?.message || 'Failed to delete group.')
    });
  }

  isCreator(group: any): boolean {
    return group.createdBy?._id?.toString() === this.currentUser?._id?.toString() ||
           group.createdBy?.toString() === this.currentUser?._id?.toString();
  }

  getInitials(name: string): string {
    return (name || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
