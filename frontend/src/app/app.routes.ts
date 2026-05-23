import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login';
import { RegisterComponent } from './features/auth/register/register';
import { Layout } from './shared/components/layout/layout';
import { Dashboard } from './features/dashboard/dashboard';
import { Groups } from './features/groups/groups';
import { Friends } from './features/friends/friends';
import { Activity } from './features/activity/activity';
import { Analytics } from './features/analytics/analytics';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'groups', component: Groups },
      { path: 'friends', component: Friends },
      { path: 'activity', component: Activity },
      { path: 'analytics', component: Analytics },
    ]
  },

  { path: '**', redirectTo: 'login' }
];