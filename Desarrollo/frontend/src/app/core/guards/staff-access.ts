import { inject } from '@angular/core';
import { CanActivateFn, RedirectFunction, Router } from '@angular/router';
import { Role, Session } from '../models';
import { AppStore } from '../services/app-store.service';

/** Route `data` key holding the roles allowed to open a staff screen. */
export const ROUTE_ROLES_KEY = 'roles';

const LOGIN_PATH = '/ingreso';
const ACCESS_DENIED_PATH = '/acceso-denegado';

/** Where each role lands after login (and from `/panel`); `/ingreso` without a session. */
export function landingPathFor(session: Session | null): string {
  if (!session) return LOGIN_PATH;
  return session.role === 'Odontóloga' ? '/panel/mi-agenda' : '/panel/agenda';
}

/** Staff area: only authenticated users; anonymous visitors go to `/ingreso`. */
export const authGuard: CanActivateFn = () => {
  const store = inject(AppStore);
  return store.isAuthenticated() || inject(Router).parseUrl(LOGIN_PATH);
};

/**
 * Role check for one staff screen (roles in `data.roles`). A screen without roles is open
 * to any authenticated user; a role outside the list goes to `/acceso-denegado?ruta=<path>`.
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const session = inject(AppStore).session();
  if (!session) return router.parseUrl(LOGIN_PATH);

  const roles = route.data[ROUTE_ROLES_KEY] as readonly Role[] | undefined;
  if (!roles || roles.includes(session.role)) return true;

  const path = state.url.split(/[?#]/)[0];
  return router.createUrlTree([ACCESS_DENIED_PATH], { queryParams: { ruta: path } });
};

/** Redirect for `/panel`: the landing screen of the current role. */
export const staffLandingRedirect: RedirectFunction = () => landingPathFor(inject(AppStore).session());
