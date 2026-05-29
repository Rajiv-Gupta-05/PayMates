// src/app/features/auth/register/register.component.ts
import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class RegisterComponent {
  registerForm: FormGroup;
  errorMessage: string = ''; // For showing backend errors
  isLoading: boolean = false;
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  constructor(
    private fb: FormBuilder, 
    private authService: AuthService, // Inject service
    private router: Router,          // Inject router
    private cdr: ChangeDetectorRef
  ) {
    this.registerForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      countryCode: ['+91', Validators.required],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      // Don't overwrite existing errors (like required)
      if (confirmPassword.errors) {
        confirmPassword.setErrors({ ...confirmPassword.errors, mismatch: true });
      } else {
        confirmPassword.setErrors({ mismatch: true });
      }
      return { mismatch: true };
    }
    
    if (confirmPassword && confirmPassword.errors && confirmPassword.errors['mismatch']) {
      const errors = { ...confirmPassword.errors };
      delete errors['mismatch'];
      confirmPassword.setErrors(Object.keys(errors).length > 0 ? errors : null);
    }
    return null;
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.cdr.detectChanges();

      // Map frontend form names to backend expected names
      const payload = {
        name: this.registerForm.value.fullName,
        email: this.registerForm.value.email,
        phone: `${this.registerForm.value.countryCode} ${this.registerForm.value.phone}`,
        password: this.registerForm.value.password
      };

      setTimeout(() => {
        this.authService.register(payload).subscribe({
          next: (response) => {
            this.isLoading = false;
            console.log('Registration successful!', response);
            this.router.navigate(['/dashboard']); // Go to dashboard immediately
          },
          error: (err) => {
            this.isLoading = false;
            console.error('Registration failed', err);
            this.errorMessage = err.error.message || 'An error occurred during registration.';
            this.cdr.detectChanges(); // Force UI update
          }
        });
      }, 1000);
    }
  }
}