import { Routes } from '@angular/router';
import { PUBLIC_ROUTES } from './features/public/public.routes';
import { STAFF_ROUTES } from './features/staff/staff.routes';

export const routes: Routes = [...PUBLIC_ROUTES, ...STAFF_ROUTES];
