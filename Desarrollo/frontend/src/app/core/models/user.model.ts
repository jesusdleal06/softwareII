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
export type Session = Omit<User, 'password'>;
