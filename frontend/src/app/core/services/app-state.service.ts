import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin } from 'rxjs';
import { delay } from 'rxjs/operators';
import { DashboardService } from './dashboard.service';
import { UserService } from './user.service';
import { GroupService } from './group.service';
import { ExpenseService } from './expense.service';
import { SettlementService } from './settlement.service';

/**
 * Central state store for PayMates.
 * All data is fetched ONCE when the app shell loads (Layout.ngOnInit)
 * and shared via BehaviorSubjects.
 *
 * Components subscribe to observables — NO individual HTTP calls.
 * Tab switching is always instant.
 * Mutations call the targeted refresh helpers below.
 */
@Injectable({ providedIn: 'root' })
export class AppStateService {

  // --- Subjects ---
  private _isLoading$       = new BehaviorSubject<boolean>(false);
  private _isInitialized$   = new BehaviorSubject<boolean>(false);
  private _summary$         = new BehaviorSubject<any>({ totalBalance: 0, youOwe: 0, youAreOwed: 0 });
  private _friendBalances$  = new BehaviorSubject<any[]>([]);
  private _friends$         = new BehaviorSubject<any[]>([]);
  private _groups$          = new BehaviorSubject<any[]>([]);
  private _expenses$        = new BehaviorSubject<any[]>([]);
  private _settlements$     = new BehaviorSubject<any[]>([]);

  // --- Public Observables (delay(0) defers emissions past current CD cycle → no NG0100) ---
  readonly isLoading$      = this._isLoading$.asObservable().pipe(delay(0));
  readonly isInitialized$  = this._isInitialized$.asObservable().pipe(delay(0));
  readonly summary$        = this._summary$.asObservable().pipe(delay(0));
  readonly friendBalances$ = this._friendBalances$.asObservable().pipe(delay(0));
  readonly friends$        = this._friends$.asObservable().pipe(delay(0));
  readonly groups$         = this._groups$.asObservable().pipe(delay(0));
  readonly expenses$       = this._expenses$.asObservable().pipe(delay(0));
  readonly settlements$    = this._settlements$.asObservable().pipe(delay(0));

  constructor(
    private dashboardService: DashboardService,
    private userService: UserService,
    private groupService: GroupService,
    private expenseService: ExpenseService,
    private settlementService: SettlementService
  ) {}

  /** Called once by Layout on app shell init. Loads everything in parallel. */
  loadAll(): void {
    if (this._isLoading$.value) return;
    this._isLoading$.next(true);

    forkJoin({
      summary:        this.dashboardService.getSummary(),
      friendBalances: this.dashboardService.getFriendBalances(),
      friends:        this.userService.getFriends(),
      groups:         this.groupService.getGroups(),
      expenses:       this.expenseService.getUserExpenses(),
      settlements:    this.settlementService.getUserSettlements(),
    }).subscribe({
      next: (data) => {
        this._summary$.next(data.summary);
        this._friendBalances$.next(data.friendBalances);
        this._friends$.next(data.friends);
        this._groups$.next(data.groups);
        this._expenses$.next(data.expenses);
        this._settlements$.next(data.settlements);
        this._isLoading$.next(false);
        this._isInitialized$.next(true);
      },
      error: () => {
        this._isLoading$.next(false);
        this._isInitialized$.next(true); // allow UI to render even on error
      }
    });
  }

  /** Call after adding/deleting an expense or recording a settlement. */
  refreshFinancials(): void {
    forkJoin({
      summary:        this.dashboardService.getSummary(),
      friendBalances: this.dashboardService.getFriendBalances(),
      expenses:       this.expenseService.getUserExpenses(),
      settlements:    this.settlementService.getUserSettlements(),
    }).subscribe({
      next: (data) => {
        this._summary$.next(data.summary);
        this._friendBalances$.next(data.friendBalances);
        this._expenses$.next(data.expenses);
        this._settlements$.next(data.settlements);
      }
    });
  }

  /** Call after adding/removing a friend or recording a settlement. */
  refreshFriends(): void {
    forkJoin({
      friends:        this.userService.getFriends(),
      friendBalances: this.dashboardService.getFriendBalances(),
      summary:        this.dashboardService.getSummary(),
    }).subscribe({
      next: (data) => {
        this._friends$.next(data.friends);
        this._friendBalances$.next(data.friendBalances);
        this._summary$.next(data.summary);
      }
    });
  }

  /** Call after creating/deleting a group. */
  refreshGroups(): void {
    this.groupService.getGroups().subscribe({
      next: (groups) => this._groups$.next(groups)
    });
  }

  /** Snapshot getters for components that need one-time reads. */
  get currentSummary()       { return this._summary$.value; }
  get currentFriends()       { return this._friends$.value; }
  get currentGroups()        { return this._groups$.value; }
  get currentFriendBalances(){ return this._friendBalances$.value; }
  get currentExpenses()      { return this._expenses$.value; }
  get currentSettlements()   { return this._settlements$.value; }

  /** Reset everything on logout. */
  reset(): void {
    this._isLoading$.next(false);
    this._isInitialized$.next(false);
    this._summary$.next({ totalBalance: 0, youOwe: 0, youAreOwed: 0 });
    this._friendBalances$.next([]);
    this._friends$.next([]);
    this._groups$.next([]);
    this._expenses$.next([]);
    this._settlements$.next([]);
  }
}
