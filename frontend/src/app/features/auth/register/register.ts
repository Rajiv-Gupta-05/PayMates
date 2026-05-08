// src/app/features/auth/register/register.component.ts
import { Component } from '@angular/core';
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

  constructor(
    private fb: FormBuilder, 
    private authService: AuthService, // Inject service
    private router: Router          // Inject router
  ) {
    this.registerForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.registerForm.valid) {
      // Map frontend form names to backend expected names
      const payload = {
        name: this.registerForm.value.fullName,
        email: this.registerForm.value.email,
        password: this.registerForm.value.password
      };

      this.authService.register(payload).subscribe({
        next: (response) => {
          console.log('Registration successful!', response);
          this.router.navigate(['/dashboard']); // Go to dashboard immediately
        },
        error: (err) => {
          console.error('Registration failed', err);
          this.errorMessage = err.error.message || 'An error occurred during registration.';
        }
      });
    }
  }
}