export interface Dentist {
  id: string;
  name: string;
  specialty: string;
  description: string;
  /** Linked staff user id, when the dentist has an account. */
  initials: string;
}
