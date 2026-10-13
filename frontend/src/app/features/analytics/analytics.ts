import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { AppStateService } from '../../core/services/app-state.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss',
})
export class Analytics implements OnInit, OnDestroy {
  currentUser: any;
  private subs = new Subscription();

  // Summary stats
  totalSpent = 0;
  totalLent = 0;
  totalBorrowed = 0;

  // Chart Options
  public chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#adb5bd', font: { family: 'Inter', size: 12 } },
        position: 'bottom'
      },
    },
    scales: {
      x: { ticks: { color: '#adb5bd' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#adb5bd' }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };

  public doughnutOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#adb5bd', font: { family: 'Inter', size: 12 } },
        position: 'right'
      }
    }
  };

  // Category Doughnut Chart Data
  public categoryChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  
  // Monthly Line Chart Data
  public monthlyChartData: ChartData<'line'> = { labels: [], datasets: [] };

  // Friend Breakdown
  topFriends: any[] = [];
  
  // Extra Insights
  biggestExpense: any = null;
  monthlyTrend = 0;

  constructor(
    private appState: AppStateService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    this.subs.add(
      this.appState.expenses$.subscribe(expenses => {
        if (expenses) {
          this.processAnalytics(expenses);
          this.cdr.detectChanges();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private processAnalytics(expenses: any[]): void {
    let spent = 0;
    let lent = 0;
    let borrowed = 0;
    let maxExpense = 0;
    const categoryTotals: { [key: string]: number } = {};
    const monthlyTotals: { [key: string]: number } = {};
    const friendTotals: { [key: string]: { name: string, amount: number, initial: string } } = {};

    // Get last 6 months labels
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const last6Months: string[] = [];
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const d2 = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const label = `${monthNames[d2.getMonth()]} ${d2.getFullYear()}`;
      last6Months.push(label);
      monthlyTotals[label] = 0;
    }

    expenses.forEach(exp => {
      // Find my split
      const mySplit = exp.splits?.find((s: any) => (s.user?._id || s.user)?.toString() === this.currentUser?._id?.toString());
      if (!mySplit) return;

      const net = mySplit.amountPaid - mySplit.amountOwed;
      if (net > 0) lent += net;
      if (net < 0) borrowed += Math.abs(net);
      
      // Calculate my portion of the expense (what I actually owe/spent)
      const myShare = mySplit.amountOwed;
      if (myShare > 0) {
        spent += myShare;
        
        if (myShare > maxExpense) {
          maxExpense = myShare;
          this.biggestExpense = exp;
        }

        // Categories
        const cat = exp.category || 'OTHER';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + myShare;

        // Monthly
        const expDate = new Date(exp.createdAt);
        const monthLabel = `${monthNames[expDate.getMonth()]} ${expDate.getFullYear()}`;
        if (monthlyTotals[monthLabel] !== undefined) {
          monthlyTotals[monthLabel] += myShare;
        }

        // Friends involved
        exp.splits.forEach((s: any) => {
          const uId = (s.user?._id || s.user)?.toString();
          if (uId !== this.currentUser?._id?.toString()) {
            if (!friendTotals[uId]) {
              friendTotals[uId] = { 
                name: s.user?.name || 'Unknown', 
                amount: 0, 
                initial: (s.user?.name || '?')[0].toUpperCase() 
              };
            }
            // Roughly attribute shared cost proportional
            friendTotals[uId].amount += (myShare / (exp.splits.length - 1 || 1));
          }
        });
      }
    });

    this.totalSpent = spent;
    this.totalLent = lent;
    this.totalBorrowed = borrowed;

    // Update Category Chart
    const catLabels = Object.keys(categoryTotals);
    const catData = Object.values(categoryTotals);
    this.categoryChartData = {
      labels: catLabels,
      datasets: [{
        data: catData,
        backgroundColor: ['#00ffcc', '#007bff', '#ff6b6b', '#feca57', '#a29bfe', '#fd79a8'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    };

    // Update Monthly Chart
    this.monthlyChartData = {
      labels: last6Months,
      datasets: [{
        label: 'Your Spending',
        data: last6Months.map(m => monthlyTotals[m]),
        backgroundColor: 'rgba(0, 255, 204, 0.1)',
        borderColor: '#00ffcc',
        borderWidth: 2,
        pointBackgroundColor: '#00ffcc',
        fill: true,
        tension: 0.4
      }]
    };
    
    // Calculate Monthly Trend (This month vs Last month)
    const thisMonth = monthlyTotals[last6Months[5]];
    const lastMonth = monthlyTotals[last6Months[4]];
    if (lastMonth > 0) {
      this.monthlyTrend = ((thisMonth - lastMonth) / lastMonth) * 100;
    } else {
      this.monthlyTrend = thisMonth > 0 ? 100 : 0;
    }

    // Update Friends
    this.topFriends = Object.values(friendTotals)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4); // Top 4
  }
}
