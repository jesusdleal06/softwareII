export interface Dentist {
  id: string;
  name: string;
  specialty: string;
  description: string;
  /** Linked staff user id, when the dentist has an account. */
  initials: string;
  /** Cloudinary photo URL; null when the dentist has not uploaded one. */
  photoUrl?: string | null;
  /** Academic titles shown to patients when choosing a dentist. */
  academicTitles?: string[];
}

/** GET/PUT /api/v1/dentists/me/profile mapped for the profile screen. */
export interface DentistProfile {
  id: string;
  firstName: string;
  secondName: string | null;
  firstSurname: string;
  secondSurname: string | null;
  fullName: string;
  specialty: string;
  photoUrl: string | null;
  academicTitles: string[];
  description: string;
}

/** Editable profile fields; empty optional values are sent as null. */
export interface DentistProfileForm {
  firstName: string;
  secondName: string;
  firstSurname: string;
  secondSurname: string;
  academicTitles: string[];
  description: string;
}
