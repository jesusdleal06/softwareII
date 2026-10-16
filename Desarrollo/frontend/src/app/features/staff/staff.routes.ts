import { Routes } from '@angular/router';
import { authGuard, roleGuard, ROUTE_ROLES_KEY, staffLandingRedirect } from '../../core/guards/staff-access';
import { sectionRoles } from './staff-sections';

export const STAFF_ROUTES: Routes = [
  {
    path: 'ingreso',
    title: 'Ingreso del personal · Villadent AgendaPro',
    loadComponent: () => import('./pages/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'acceso-denegado',
    title: 'Acceso denegado · Villadent AgendaPro',
    loadComponent: () => import('./pages/access-denied-page').then((m) => m.AccessDeniedPage),
  },
  {
    path: 'panel',
    title: 'Panel del personal · Villadent AgendaPro',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/staff-shell').then((m) => m.StaffShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: staffLandingRedirect },
      {
        path: 'agenda',
        canActivate: [roleGuard],
        data: { [ROUTE_ROLES_KEY]: sectionRoles('agenda') },
        loadComponent: () => import('./pages/agenda-page').then((m) => m.AgendaPage),
      },
      {
        path: 'mi-agenda',
        canActivate: [roleGuard],
        data: { [ROUTE_ROLES_KEY]: sectionRoles('mi-agenda') },
        loadComponent: () => import('./pages/my-agenda-page').then((m) => m.MyAgendaPage),
      },
      {
        path: 'reportes',
        canActivate: [roleGuard],
        data: { [ROUTE_ROLES_KEY]: sectionRoles('reportes') },
        loadComponent: () => import('./pages/reports-page').then((m) => m.ReportsPage),
      },
    ],
  },
];
