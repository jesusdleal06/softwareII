import { Role } from '../../core/models';

export type StaffSectionId = 'agenda' | 'mi-agenda' | 'reportes';

export interface StaffSection {
  id: StaffSectionId;
  href: string;
  label: string;
  roles: readonly Role[];
}

/** Staff panel screens and the roles allowed in each (prototype `RUTAS_PANEL`). */
export const STAFF_SECTIONS: readonly StaffSection[] = [
  { id: 'agenda', href: '/panel/agenda', label: 'Agenda', roles: ['Auxiliar administrativa'] },
  { id: 'mi-agenda', href: '/panel/mi-agenda', label: 'Mi agenda', roles: ['Odontóloga'] },
  { id: 'reportes', href: '/panel/reportes', label: 'Reportes', roles: ['Auxiliar administrativa'] },
];

export function sectionRoles(id: StaffSectionId): readonly Role[] {
  return STAFF_SECTIONS.find((s) => s.id === id)?.roles ?? [];
}
