import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/pages/register/register.component').then((m) => m.RegisterComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'register/:token',
    loadComponent: () => import('./features/auth/pages/register/register.component').then((m) => m.RegisterComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/pages/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'reset-password/:token',
    loadComponent: () =>
      import('./features/auth/pages/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'verify-email/:token',
    loadComponent: () =>
      import('./features/auth/pages/verify-email/verify-email.component').then((m) => m.VerifyEmailComponent),
  },
  {
    path: '',
    loadComponent: () => import('./features/home/pages/home/home.component').then((m) => m.HomeComponent),
    canActivate: [authGuard],
  },
  {
    path: 'konto/sitzungen',
    loadComponent: () =>
      import('./features/account/pages/sessions/sessions.component').then((m) => m.SessionsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'admin/einladungen',
    loadComponent: () =>
      import('./features/admin/pages/registration-tokens/registration-tokens.component').then(
        (m) => m.RegistrationTokensComponent,
      ),
    canActivate: [adminGuard],
  },
  { path: '**', redirectTo: '' },
];
