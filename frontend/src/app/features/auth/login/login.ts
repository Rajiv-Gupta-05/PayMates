// src/app/features/auth/login/login.component.ts
import { Component, ChangeDetectorRef, OnInit, AfterViewInit, PLATFORM_ID, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

// Global google object injected by accounts.google.com/gsi/client in index.html
declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent implements OnInit, AfterViewInit {
  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;
  showPassword: boolean = false;

  private platformId = inject(PLATFORM_ID);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initGIS();
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.renderGISButton();
    }
  }

  // ─── GIS Setup ─────────────────────────────────────────────────────────────

  private initGIS(): void {
    const clientId = this.authService.getGoogleClientId();
    if (!this.isConfigured(clientId)) return;

    const tryInit = () => {
      if (typeof google !== 'undefined' && google?.accounts?.id) {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp: any) => this.onGoogleCredential(resp),
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      } else {
        setTimeout(tryInit, 150);
      }
    };
    tryInit();
  }

  /**
   * Renders the official GIS button inside #gis-btn-container with opacity ~0.
   * It is invisible but fully interactive — clicks on the visual button area
   * pass through and hit this element because it is layered on top (z-index: 10).
   * This avoids FedCM, One-Tap suppression, and COOP issues completely.
   */
  private renderGISButton(): void {
    const clientId = this.authService.getGoogleClientId();
    if (!this.isConfigured(clientId)) return;

    const tryRender = () => {
      const container = document.getElementById('gis-btn-container');
      if (!container) { setTimeout(tryRender, 150); return; }

      if (typeof google !== 'undefined' && google?.accounts?.id) {
        // Use the styled button wrapper width in px
        const wrapperEl = document.getElementById('google-btn-wrapper');
        const width = wrapperEl ? Math.floor(wrapperEl.offsetWidth) || 400 : 400;

        google.accounts.id.renderButton(container, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          width: width,
        });
      } else {
        setTimeout(tryRender, 150);
      }
    };
    tryRender();
  }

  // ─── Credential Callback ────────────────────────────────────────────────────

  private onGoogleCredential(response: any): void {
    const idToken = response?.credential;
    if (!idToken) {
      this.errorMessage = 'Google sign-in failed — no credential received.';
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.authService.googleLogin(idToken).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Google sign-in failed. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  // ─── Email / Password Login ─────────────────────────────────────────────────

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.cdr.detectChanges();

      setTimeout(() => {
        this.authService.login(this.loginForm.value).subscribe({
          next: (response) => {
            this.isLoading = false;
            this.router.navigate(['/dashboard']);
          },
          error: (err) => {
            this.isLoading = false;
            this.errorMessage = err.error?.message || 'Invalid email or password.';
            this.cdr.detectChanges();
          }
        });
      }, 1000);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private isConfigured(clientId: string): boolean {
    return !!clientId && clientId !== 'YOUR_GOOGLE_CLIENT_ID_HERE';
  }
}