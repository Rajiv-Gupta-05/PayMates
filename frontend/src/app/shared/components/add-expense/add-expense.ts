import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ExpenseService } from '../../../core/services/expense.service';
import { AppStateService } from '../../../core/services/app-state.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-add-expense',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './add-expense.html',
  styleUrl: './add-expense.scss',
})
export class AddExpense implements OnInit, OnDestroy {
  expenseForm: FormGroup;
  groups: any[] = [];
  friends: any[] = [];
  currentUser: any;
  private subs = new Subscription();

  selectedGroup: any = null;
  participants: any[] = [];
  paidBy: any = null;

  splitMode: 'equal' | 'custom' = 'equal';
  customSplits: { [userId: string]: number } = {};

  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  selectedGroupName: string = 'No Group (Individual)';
  isDropdownOpen = false;

  readonly CATEGORIES = ['FOOD','TRANSPORT','ACCOMMODATION','UTILITIES','ENTERTAINMENT','SHOPPING','OTHER'];
  readonly CAT_ICONS: { [k: string]: string } = {
    FOOD:'🍔', TRANSPORT:'🚗', ACCOMMODATION:'🏠', UTILITIES:'💡',
    ENTERTAINMENT:'🎬', SHOPPING:'🛍️', OTHER:'📦'
  };
  readonly Math = Math;

  constructor(
    private fb: FormBuilder,
    private expenseService: ExpenseService,
    private appState: AppStateService,
    private authService: AuthService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private el: ElementRef,
    private toastService: ToastService
  ) {
    this.expenseForm = this.fb.group({
      description: ['', Validators.required],
      totalAmount: ['', [Validators.required, Validators.min(0.01)]],
      category: ['OTHER'],
      groupId: ['']
    });
  }

  isEditMode = false;
  editExpenseId: string | null = null;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    // If the click is outside the dropdown element, close it
    if (this.isDropdownOpen && !target.closest('.custom-input-group.dropdown')) {
      this.isDropdownOpen = false;
    }
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.paidBy = this.currentUser;
    this.participants = [this.currentUser];

    this.subs.add(this.appState.groups$.subscribe(g => { 
      setTimeout(() => {
        this.groups = g; 
        this.cdr.markForCheck();
      });
    }));
    
    this.subs.add(this.appState.friends$.subscribe(f => {
      setTimeout(() => {
        this.friends = f;
        if (!this.selectedGroup && !this.isEditMode) {
          this.participants = [this.currentUser];
        }
        this.cdr.markForCheck();
      });
    }));

    this.subs.add(this.appState.editingExpense$.subscribe(exp => {
      if (exp) {
        this.isEditMode = true;
        this.editExpenseId = exp._id;
        this.expenseForm.patchValue({
          description: exp.description,
          totalAmount: exp.totalAmount,
          category: exp.category || 'OTHER',
          groupId: exp.groupId?._id || exp.groupId || ''
        });
        
        if (exp.groupId) {
          const gId = exp.groupId._id || exp.groupId;
          this.selectedGroup = this.groups.find(g => g._id === gId) || exp.groupId;
        } else {
          this.selectedGroup = null;
        }

        this.participants = exp.splits.map((s: any) => s.user);
        this.customSplits = {};
        exp.splits.forEach((s: any) => {
          this.customSplits[s.user._id] = s.amountOwed;
          if (s.amountPaid > 0) this.paidBy = s.user;
        });
      } else {
        this.isEditMode = false;
        this.editExpenseId = null;
        this.expenseForm.reset({ category: 'OTHER', groupId: '' });
        this.selectedGroup = null;
        this.participants = [this.currentUser];
        this.paidBy = this.currentUser;
        this.customSplits = {};
      }
    }));

    if (typeof document !== 'undefined') {
      const modalElement = document.getElementById('addExpenseModal');
      if (modalElement) {
        modalElement.addEventListener('hidden.bs.modal', () => {
          this.ngZone.run(() => {
            if (!this.isSubmitting) {
              this.resetForm();
              this.appState.setEditingExpense(null);
              this.cdr.detectChanges();
            }
          });
        });
      }
    }
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  closeModal(): void {
    this.appState.setEditingExpense(null);
  }

  onGroupChange(): void {
    const groupId = this.expenseForm.value.groupId;
    if (groupId) {
      const g = this.groups.find(gr => gr._id?.toString() === groupId?.toString());
      this.selectedGroup = g || null;
      if (g) {
        // Build participants from group members, ensure current user is included
        this.participants = g.members ? [...g.members] : [];
        const selfInList = this.participants.some(
          (p: any) => p._id?.toString() === this.currentUser?._id?.toString()
        );
        if (!selfInList) { this.participants.unshift(this.currentUser); }
      }
    } else {
      this.selectedGroup = null;
      this.participants = [this.currentUser];
    }
    this.paidBy = this.currentUser;
    this.customSplits = {};
  }

  toggleParticipant(friend: any): void {
    const idx = this.participants.findIndex(
      p => p._id?.toString() === friend._id?.toString()
    );
    if (idx >= 0) {
      if (friend._id?.toString() === this.currentUser?._id?.toString()) return;
      this.participants.splice(idx, 1);
      delete this.customSplits[friend._id];
    } else {
      this.participants.push(friend);
    }
  }

  isParticipant(id: string): boolean {
    return this.participants.some(p => p._id?.toString() === id?.toString());
  }

  getEqualShare(): number {
    const total = parseFloat(this.expenseForm.value.totalAmount) || 0;
    if (this.participants.length === 0) return 0;
    return Math.floor((total / this.participants.length) * 100) / 100;
  }

  get customSplitTotal(): number {
    return parseFloat(
      Object.values(this.customSplits)
        .reduce((s, v) => s + (parseFloat(v as any) || 0), 0)
        .toFixed(2)
    );
  }

  /**
   * Builds splits with guaranteed exact sum.
   *
   * Equal split:  ₹100 / 3 → [33.33, 33.33, 33.34]   (last gets remainder)
   * Custom split: uses entered values directly
   *
   * Uses toString() for _id comparison to avoid ObjectId ≠ string mismatch.
   */
  buildSplits(): any[] {
    const total = Math.round(parseFloat(this.expenseForm.value.totalAmount) * 100) / 100;
    const paidByIdStr = this.paidBy?._id?.toString();
    const count = this.participants.length;

    if (this.splitMode === 'equal') {
      // Distribute in whole cents, give remainder to last person
      const totalCents = Math.round(total * 100);
      const baseCents = Math.floor(totalCents / count);
      const remainderCents = totalCents - baseCents * count;

      return this.participants.map((p, i) => {
        const extraCent = i < remainderCents ? 1 : 0;
        const amountOwed = (baseCents + extraCent) / 100;
        return {
          user: p._id,
          amountPaid: p._id?.toString() === paidByIdStr ? total : 0,
          amountOwed
        };
      });
    }

    // Custom splits
    return this.participants.map(p => ({
      user: p._id,
      amountPaid: p._id?.toString() === paidByIdStr ? total : 0,
      amountOwed: Math.round((parseFloat(this.customSplits[p._id] as any) || 0) * 100) / 100
    }));
  }

  submit(): void {
    if (this.expenseForm.invalid) return;
    if (this.participants.length < 2) {
      this.errorMessage = 'Add at least one other person to split with.';
      return;
    }

    const total = Math.round(parseFloat(this.expenseForm.value.totalAmount) * 100) / 100;
    const splits = this.buildSplits();
    const totalOwed = Math.round(splits.reduce((s, sp) => s + sp.amountOwed, 0) * 100) / 100;
    const totalPaid = Math.round(splits.reduce((s, sp) => s + sp.amountPaid, 0) * 100) / 100;

    // Sanity check — should always pass with the cents-based rounding above
    if (Math.abs(totalOwed - total) > 0.01) {
      this.errorMessage = `Split mismatch: ₹${totalOwed.toFixed(2)} ≠ ₹${total.toFixed(2)}. Adjust amounts.`;
      return;
    }
    if (Math.abs(totalPaid - total) > 0.01) {
      this.errorMessage = `Paid amount mismatch. Please select who paid.`;
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const payload = {
      description: this.expenseForm.value.description.trim(),
      totalAmount: total,
      category: this.expenseForm.value.category || 'OTHER',
      groupId: this.expenseForm.value.groupId || undefined,
      splits
    };

    const request = this.isEditMode && this.editExpenseId
      ? this.expenseService.updateExpense(this.editExpenseId, payload)
      : this.expenseService.createExpense(payload);

    request.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toastService.show(this.isEditMode ? 'Expense updated successfully!' : 'Expense added successfully!', 'success');
        this.resetForm();
        this.appState.refreshFinancials();
        this.appState.setEditingExpense(null);
        document.getElementById('closeAddExpenseModal')?.click();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || (this.isEditMode ? 'Failed to update expense.' : 'Failed to create expense.');
      }
    });
  }

  private resetForm(): void {
    this.expenseForm.reset({ description: '', totalAmount: '', category: 'OTHER', groupId: '' });
    this.selectedGroup = null;
    this.participants = [this.currentUser];
    this.paidBy = this.currentUser;
    this.splitMode = 'equal';
    this.customSplits = {};
    this.selectedGroupName = 'No Group (Individual)';
    this.isDropdownOpen = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  onAmountInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value && input.value.length > 8) {
      input.value = input.value.slice(0, 8);
      this.expenseForm.patchValue({ totalAmount: input.value });
    }
  }

  getInitials(name: string): string {
    return (name || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  selectGroup(groupId: string, groupName: string) {
    this.expenseForm.patchValue({ groupId: groupId });
    this.selectedGroupName = groupName;
    this.isDropdownOpen = false; // <-- Close the dropdown after selection
    this.onGroupChange(); 
  }
}
