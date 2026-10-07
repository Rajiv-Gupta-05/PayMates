import {
  Component,
  EventEmitter,
  OnInit,
  Output,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InviteService } from '../../../core/services/invite.service';

@Component({
  selector: 'app-invite-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invite-modal.html',
  styleUrl: './invite-modal.scss',
})
export class InviteModal implements OnInit {
  @Output() closed = new EventEmitter<void>();

  personalMessage = '';

  isSending = false;
  successMessage = '';
  errorMessage = '';
  lastError = '';
  showSetupGuide = false;

  emailTags: string[] = [];
  emailInputTemp = '';

  // ─── WhatsApp ─────────────────────────────────────────────────────────────
  waPhoneInput = '';
  waCopied = false;

  /** Base app URL used in WA messages (production should replace with real domain) */
  private readonly APP_URL = window.location.origin;

  constructor(
    private inviteService: InviteService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {}

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  // ─── Email tag handling ───────────────────────────────────────────────────
  onEmailKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addEmailTag();
    }
    if (event.key === 'Backspace' && !this.emailInputTemp && this.emailTags.length) {
      this.emailTags.pop();
    }
  }

  addEmailTag(): void {
    const raw = this.emailInputTemp.trim().replace(/,/g, '');
    if (!raw) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(raw)) {
      this.errorMessage = `"${raw}" is not a valid email address.`;
      return;
    }
    if (this.emailTags.includes(raw)) {
      this.errorMessage = 'This email is already added.';
      return;
    }
    if (this.emailTags.length >= 5) {
      this.errorMessage = 'You can invite up to 5 people at a time.';
      return;
    }
    this.emailTags.push(raw);
    this.emailInputTemp = '';
    this.clearMessages();
  }

  removeEmailTag(idx: number): void {
    this.emailTags.splice(idx, 1);
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  get canSend(): boolean {
    const tags = [...this.emailTags];
    if (this.emailInputTemp.trim()) tags.push(this.emailInputTemp.trim());
    return tags.length > 0 && !this.isSending;
  }

  sendInvites(): void {
    this.clearMessages();
    this.lastError = '';

    // Commit any pending typed email first
    if (this.emailInputTemp.trim()) {
      this.addEmailTag();
    }

    if (!this.emailTags.length) {
      this.errorMessage = 'Please enter at least one email address.';
      return;
    }

    this.isSending = true;
    this.cdr.detectChanges();

    let completed = 0;
    let failed = 0;

    const done = () => {
      completed++;
      if (completed === this.emailTags.length) {
        this.isSending = false;
        if (failed === 0) {
          this.successMessage = `🎉 Invite${this.emailTags.length > 1 ? 's' : ''} sent successfully!`;
          this.emailTags = [];
          this.personalMessage = '';
        } else if (failed < completed) {
          this.successMessage = `Partially sent — ${completed - failed} of ${completed} succeeded.`;
        } else {
          this.errorMessage = this.lastError || 'Failed to send invites. Please try again.';
        }
        this.cdr.detectChanges();

        if (this.successMessage) {
          setTimeout(() => {
            this.successMessage = '';
            this.cdr.detectChanges();
          }, 4000);
        }
      }
    };

    // Snapshot tags at send time so reset mid-send doesn't break count
    const recipients = [...this.emailTags];

    recipients.forEach((val) => {
      this.inviteService
        .sendInvite({
          type: 'email',
          value: val,
          message: this.personalMessage.trim() || undefined,
        })
        .subscribe({
          next: () => done(),
          error: (err) => {
            failed++;
            const backendMsg: string = err?.error?.message || '';
            const code: string = err?.error?.code || '';

            if (code === 'SMTP_NOT_CONFIGURED') {
              this.lastError = '⚙️ Email not configured yet. See setup instructions below.';
              this.showSetupGuide = true;
            } else if (code === 'SMTP_AUTH_FAILED') {
              this.lastError = '🔑 Gmail authentication failed. Check your App Password in backend/.env';
            } else if (backendMsg) {
              this.lastError = backendMsg;
            }
            done();
          },
        });
    });
  }

  /** Constructs the wa.me URL with the current message/phone */
  buildWhatsAppLink(): string {
    const msg = this.buildWaMessage();
    const phone = this.sanitizePhone(this.waPhoneInput);
    const encoded = encodeURIComponent(msg);
    return phone
      ? `https://wa.me/${phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
  }

  shareViaWhatsApp(): void {
    window.open(this.buildWhatsAppLink(), '_blank', 'noopener,noreferrer');
  }

  copyWhatsAppLink(): void {
    navigator.clipboard.writeText(this.buildWhatsAppLink()).then(() => {
      this.waCopied = true;
      this.cdr.detectChanges();
      setTimeout(() => { this.waCopied = false; this.cdr.detectChanges(); }, 2500);
    });
  }

  private buildWaMessage(): string {
    const custom = this.personalMessage.trim();
    const base = custom
      ? `${custom}\n\n`
      : `Hey! I've been using PayMates to split expenses with friends — no more awkward money conversations! 🎉\n\n`;
    return `${base}Join me on PayMates 👉 ${this.APP_URL}`;
  }

  private sanitizePhone(raw: string): string {
    // Strip all non-digits; prepend country code 91 if 10-digit Indian number
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10) return `91${digits}`;
    return digits;
  }

  closeModal(): void {
    this.closed.emit();
    this.reset();
  }

  private reset(): void {
    this.emailTags = [];
    this.emailInputTemp = '';
    this.personalMessage = '';
    this.waPhoneInput = '';
    this.waCopied = false;
    this.clearMessages();
    this.isSending = false;
    this.lastError = '';
    this.showSetupGuide = false;
  }
}
