
import { Routes } from '@angular/router';

import { Login } from './auth/login';
import { Register } from './auth/register';
import { Dashboard } from './dashboard/dashboard';

import { authGuard } from './services/auth.guard';
import { guestGuard } from './services/guest.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'login',
    component: Login,
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    component: Register,
    canActivate: [guestGuard],
  },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
