import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule, AsyncPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { AddExpense } from '../add-expense/add-expense';
import { AuthService } from '../../../core/services/auth.service';
import { AppStateService } from '../../../core/services/app-state.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, AsyncPipe, FormsModule, ReactiveFormsModule, AddExpense],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout implements OnInit {
  currentUser: any = null;

  // Profile Form
  profileForm: FormGroup;
  isUpdatingProfile = false;
  profileSuccessMessage = '';
  profileErrorMessage = '';

  // Expose observable directly — use async pipe in template to avoid NG0100
  isLoading$: Observable<boolean>;

  constructor(
    private authService: AuthService,
    private appState: AppStateService,
    private userService: UserService,
    private router: Router,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.isLoading$ = this.appState.isLoading$;
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      email: [{value: '', disabled: true}],
      phone: ['', [Validators.pattern('^[0-9]{10}$')]],
      avatar: ['']
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser) {
      this.profileForm.patchValue({
        name: this.currentUser.name || '',
        email: this.currentUser.email || '',
        phone: this.currentUser.phone || '',
        avatar: this.currentUser.avatar || ''
      });
    }
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

  updateProfile(): void {
    if (this.profileForm.invalid) return;

    this.isUpdatingProfile = true;
    this.profileErrorMessage = '';
    this.profileSuccessMessage = '';
    this.cdr.detectChanges(); // Ensure the loader displays immediately

    const data = this.profileForm.getRawValue();

    this.userService.updateProfile(data).subscribe({
      next: (updatedUser) => {
        // Artificial delay of 2 seconds so the user can see the loader
        setTimeout(() => {
          this.isUpdatingProfile = false;
          this.authService.saveUser(updatedUser);
          this.currentUser = updatedUser;
          this.profileSuccessMessage = 'Profile updated successfully!';
          this.cdr.detectChanges(); // force view update instantly

          setTimeout(() => {
            this.profileSuccessMessage = '';
            document.getElementById('closeProfileModal')?.click();
          }, 1500);
        }, 2000);
      },
      error: (err) => {
        setTimeout(() => {
          this.isUpdatingProfile = false;
          this.profileErrorMessage = err.error?.message || 'Failed to update profile.';
          this.cdr.detectChanges();
        }, 2000);
      }
    });
  }

  logout(): void {
    document.getElementById('closeProfileModal')?.click();
    this.appState.reset();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
