/** Staff role. Values are the Spanish labels shown in the UI. */
export type Role = 'Auxiliar administrativa' | 'Odontóloga';

export interface User {
  email: string;
  password: string;
  name: string;
  role: Role;
  dentistId?: string;
}

/** Authenticated user without credentials. */
export interface Session {
  email: string;
  name: string;
  role: Role;
  /** Backend user id. */
  userId?: string;
  /** The dentist row linked to an ODONTOLOGO user. */
  dentistId?: string;
  /** Bearer token returned by the API. */
  token?: string;
}
