import { USERS } from '../../core/data/mock-data';
import { Session } from '../../core/models';
import { SessionStorageLike } from '../../core/services/tokens';

export const SESSION_KEY = 'villadent-sesion';

/** Prototype users as sessions: the administrative assistant and the dentist (d1). */
export const ASSISTANT_SESSION: Session = toSession(0);
export const DENTIST_SESSION: Session = toSession(1);

function toSession(index: number): Session {
  const { password: _password, ...session } = USERS[index];
  return session;
}

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
