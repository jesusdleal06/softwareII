export interface DentistProfileInput {
  firstName: string;
  secondName: string;
  firstSurname: string;
  secondSurname: string;
  academicTitles: string[];
  description: string;
}

export type DentistProfileErrors = Partial<
  Record<'firstName' | 'firstSurname' | 'academicTitles' | 'description' | 'photo', string>
>;

export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

/** Client-side rules for the dentist profile form; empty object when valid. */
export function validateDentistProfile(input: DentistProfileInput): DentistProfileErrors {
  const errors: DentistProfileErrors = {};
  if (!input.firstName.trim()) {
    errors.firstName = 'El primer nombre es obligatorio.';
  }
  if (!input.firstSurname.trim()) {
    errors.firstSurname = 'El primer apellido es obligatorio.';
  }
  if (!input.academicTitles.some((title) => title.trim())) {
    errors.academicTitles = 'Agrega al menos un título académico.';
  }
  if (!input.description.trim()) {
    errors.description = 'La descripción es obligatoria.';
  } else if (input.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = 'La descripción no puede superar 500 caracteres.';
  }
  return errors;
}

/** Validates the chosen image; returns its Spanish error message or null. */
export function validateDentistPhoto(file: File | null): string | null {
  if (!file) return null;
  if (file.size > MAX_PHOTO_BYTES) return 'La imagen no puede superar 5 MB.';
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) return 'La imagen debe ser JPG, PNG o WebP.';
  return null;
}

/** Full name with the present parts only, so absent surnames leave no double spaces. */
export function composeFullName(input: DentistProfileInput): string {
  return [input.firstName, input.secondName, input.firstSurname, input.secondSurname]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(' ');
}

export function descriptionLength(value: string): number {
  return value.length;
}
