// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login';
import { RegisterComponent } from './features/auth/register/register';
import { Layout } from './shared/components/layout/layout';
import { Dashboard } from './features/dashboard/dashboard';
import { Groups } from './features/groups/groups';
import { Friends } from './features/friends/friends';
import { Activity } from './features/activity/activity';

export const routes: Routes = [
  // 1. Default Route: Redirects empty path to login
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  { 
    path: '', 
    component: Layout,
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'groups', component: Groups },
      { path: 'friends', component: Friends },
      { path: 'activity', component: Activity },
    ]
  },

  // 3. Wildcard Route: Catches invalid URLs (404s) and redirects to login
  { 
    path: '**', 
    redirectTo: 'login' 
  }
];