import { Session } from '../../core/models';
import { SessionStorageLike } from '../../core/services/tokens';

export const SESSION_KEY = 'villadent-sesion';

/** Staff sessions: the administrative assistant and the dentist (d1). */
export const ASSISTANT_SESSION: Session = {
  email: 'ana@villadent.co',
  name: 'Ana María Rueda',
  role: 'Auxiliar administrativa',
  userId: '2',
  token: 'test-token-assistant',
};

export const DENTIST_SESSION: Session = {
  email: 'laura@villadent.co',
  name: 'Dra. Laura Villamizar',
  role: 'Odontóloga',
  userId: '3',
  dentistId: 'd1',
  token: 'test-token-dentist',
};

/** In-memory `sessionStorage` replacement, optionally holding a saved staff session. */
export function memoryStorage(session?: Session): SessionStorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (session) data.set(SESSION_KEY, JSON.stringify(session));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}
