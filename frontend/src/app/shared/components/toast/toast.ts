import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../../core/services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.html',
  styleUrls: ['./toast.scss']
})
export class ToastComponent implements OnInit, OnDestroy {
  toast: ToastMessage | null = null;
  isVisible = false;
  private sub = new Subscription();
  private timeoutId: any;

  constructor(private toastService: ToastService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.sub.add(
      this.toastService.toast$.subscribe(toast => {
        if (toast) {
          // Defer the assignment of 'this.toast' to avoid NG0100 when triggered during Change Detection
          setTimeout(() => {
            this.toast = toast;
            this.cdr.markForCheck();
            
            // small delay to ensure DOM updates before triggering CSS transition
            setTimeout(() => {
              this.isVisible = true;
              this.cdr.markForCheck();
            }, 10);
          });

          if (this.timeoutId) {
            clearTimeout(this.timeoutId);
          }

          this.timeoutId = setTimeout(() => {
            this.isVisible = false;
            this.cdr.markForCheck();
            
            // Wait for fade out animation before removing from DOM completely
            setTimeout(() => {
              this.toast = null;
              this.cdr.markForCheck();
            }, 300); // 300ms matches the CSS transition duration
          }, toast.duration || 1000);
        } else {
          setTimeout(() => {
            this.isVisible = false;
            this.toast = null;
            this.cdr.markForCheck();
          });
        }
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
}
