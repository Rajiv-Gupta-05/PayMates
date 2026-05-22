import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AppStateService } from '../../core/services/app-state.service';
import { UserService } from '../../core/services/user.service';
import { SettlementService } from '../../core/services/settlement.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './friends.html',
  styleUrl: './friends.scss',
})
export class Friends implements OnInit, OnDestroy {
  friends: any[] = [];
  friendBalances: { [id: string]: number } = {};
  searchQuery = '';
  currentUser: any;
  private subs = new Subscription();

  // Add friend
  addSearchQuery = '';
  addSearchResults: any[] = [];
  addFriendError = '';
  addFriendSuccess = '';
  isAdding: { [id: string]: boolean } = {};   // per-user loading flag

  // Remove friend — inline confirmation instead of browser confirm()
  removingFriendId: string | null = null;
  isRemoving = false;
  removeError = '';

  // Settle up
  settleFriend: any = null;
  settleAmount = '';
  settleNote = '';
  settleError = '';
  isSettling = false;

  constructor(
    private appState: AppStateService,
    private userService: UserService,
    private settlementService: SettlementService,
    private authService: AuthService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    this.subs.add(this.appState.friends$.subscribe(f => {
      this.friends = f; this.cdr.detectChanges();
    }));
    this.subs.add(this.appState.friendBalances$.subscribe(fb => {
      this.friendBalances = {};
      fb.forEach(b => { this.friendBalances[b.friend._id] = b.balance; });
      this.cdr.detectChanges();
    }));
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  // ── Search ────────────────────────────────────────────────────────
  get filteredFriends(): any[] {
    const q = this.searchQuery.toLowerCase();
    if (!q) return this.friends;
    return this.friends.filter(f =>
      f.name.toLowerCase().includes(q) || f.email.toLowerCase().includes(q)
    );
  }

  searchForFriend(): void {
    this.addFriendError = '';
    if (this.addSearchQuery.trim().length < 2) { this.addSearchResults = []; return; }
    this.userService.searchUsers(this.addSearchQuery).subscribe({
      next: (users) => {
        // Exclude already-friends
        this.addSearchResults = users.filter(u =>
          u._id !== this.currentUser?._id &&
          !this.friends.find(f => f._id === u._id)
        );
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  // ── Add Friend ────────────────────────────────────────────────────
  addFriend(user: any): void {
    if (this.isAdding[user._id]) return;
    this.isAdding[user._id] = true;
    this.addFriendError = '';
    this.addFriendSuccess = '';

    this.userService.addFriend(user._id).subscribe({
      next: () => {
        this.isAdding[user._id] = false;
        this.toastService.show(`${user.name} added as a friend! ✅`, 'success');
        // Remove from search results
        this.addSearchResults = this.addSearchResults.filter(u => u._id !== user._id);
        this.addSearchQuery = '';
        this.appState.refreshFriends();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isAdding[user._id] = false;
        this.addFriendError = err.error?.message || 'Could not add friend.';
        this.cdr.detectChanges();
      }
    });
  }

  // ── Remove Friend (inline confirm — no browser confirm()) ─────────
  promptRemove(friendId: string): void {
    this.removingFriendId = friendId;
    this.removeError = '';
  }

  cancelRemove(): void {
    this.removingFriendId = null;
    this.removeError = '';
  }

  confirmRemove(): void {
    if (!this.removingFriendId) return;
    this.isRemoving = true;
    this.removeError = '';

    this.userService.removeFriend(this.removingFriendId).subscribe({
      next: () => {
        this.isRemoving = false;
        this.toastService.show('Friend removed successfully', 'success');
        this.removingFriendId = null;
        this.appState.refreshFriends();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isRemoving = false;
        this.removeError = err.error?.message || 'Failed to remove friend.';
        this.cdr.detectChanges();
      }
    });
  }

  // ── Settle Up ─────────────────────────────────────────────────────
  openSettleModal(friend: any): void {
    this.settleFriend = friend;
    this.settleAmount = '';
    this.settleNote = '';
    this.settleError = '';
  }

  settleUp(): void {
    const amount = parseFloat(this.settleAmount);
    if (!amount || amount <= 0) { this.settleError = 'Enter a valid positive amount.'; return; }
    this.isSettling = true;
    this.settleError = '';

    const balance = this.friendBalances[this.settleFriend._id] || 0;
    // balance < 0 → current user owes friend → user is the payer
    const payerId = balance < 0 ? this.currentUser._id : this.settleFriend._id;
    const payeeId = balance < 0 ? this.settleFriend._id : this.currentUser._id;

    this.settlementService.settleUp({ payerId, payeeId, amount, note: this.settleNote }).subscribe({
      next: () => {
        this.isSettling = false;
        this.toastService.show('Settled up successfully! ✅', 'success');
        this.settleFriend = null;
        document.getElementById('closeSettleModal')?.click();
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

  // ── Helpers ───────────────────────────────────────────────────────
  getBalance(friendId: string): number { return this.friendBalances[friendId] || 0; }
  getInitials(name: string): string {
    return (name || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }
  abs(n: number): number { return Math.abs(n); }
}
