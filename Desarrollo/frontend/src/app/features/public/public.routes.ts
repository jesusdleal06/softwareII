import { Routes } from '@angular/router';

export const PUBLIC_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Villadent AgendaPro',
    loadComponent: () => import('./pages/landing-page').then((m) => m.LandingPage),
  },
  {
    path: 'agendar',
    title: 'Agendar cita · Villadent AgendaPro',
    loadComponent: () => import('./pages/booking-page').then((m) => m.BookingPage),
  },
  {
    path: 'cita/:token',
    title: 'Tu cita · Villadent AgendaPro',
    loadComponent: () => import('./pages/appointment-page').then((m) => m.AppointmentPage),
  },
];
