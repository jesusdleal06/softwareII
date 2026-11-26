import {
  MAX_DESCRIPTION_LENGTH,
  MAX_PHOTO_BYTES,
  composeFullName,
  descriptionLength,
  validateDentistPhoto,
  validateDentistProfile,
  type DentistProfileInput,
} from './dentist-profile';

const VALID: DentistProfileInput = {
  firstName: 'Laura',
  secondName: 'María',
  firstSurname: 'Villamizar',
  secondSurname: 'Rojas',
  academicTitles: ['Ortodoncia', 'Estética dental'],
  description: 'Odontóloga especialista en ortodoncia.',
};

function photo(type: string, size: number): File {
  const file = new File(['x'], 'foto', { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('dentist profile rules', () => {
  describe('validateDentistProfile', () => {
    it('accepts a complete profile', () => {
      expect(validateDentistProfile(VALID)).toEqual({});
    });

    it('CP-RF11-02: requires the first name', () => {
      expect(validateDentistProfile({ ...VALID, firstName: '   ' }).firstName).toBe(
        'El primer nombre es obligatorio.',
      );
    });

    it('CP-RF11-02: requires the first surname', () => {
      expect(validateDentistProfile({ ...VALID, firstSurname: '' }).firstSurname).toBe(
        'El primer apellido es obligatorio.',
      );
    });

    it('CP-RF11-03: optional second name and second surname do not block saving', () => {
      expect(
        validateDentistProfile({ ...VALID, secondName: '', secondSurname: '   ' }),
      ).toEqual({});
    });

    it('CP-RF11-04: requires at least one non-blank academic title', () => {
      expect(validateDentistProfile({ ...VALID, academicTitles: [] }).academicTitles).toBe(
        'Agrega al menos un título académico.',
      );
      expect(validateDentistProfile({ ...VALID, academicTitles: ['  ', ''] }).academicTitles).toBe(
        'Agrega al menos un título académico.',
      );
    });

    it('CP-RF11-04: accepts a description of exactly 500 characters', () => {
      expect(
        validateDentistProfile({ ...VALID, description: 'a'.repeat(MAX_DESCRIPTION_LENGTH) }),
      ).toEqual({});
    });

    it('CP-RF11-04: rejects a description of 501 characters', () => {
      expect(
        validateDentistProfile({ ...VALID, description: 'a'.repeat(MAX_DESCRIPTION_LENGTH + 1) })
          .description,
      ).toBe('La descripción no puede superar 500 caracteres.');
    });

    it('requires a description', () => {
      expect(validateDentistProfile({ ...VALID, description: '  ' }).description).toBe(
        'La descripción es obligatoria.',
      );
    });
  });

  describe('validateDentistPhoto', () => {
    it('CP-RF11-05: accepts a JPEG of exactly 5 MB', () => {
      expect(validateDentistPhoto(photo('image/jpeg', MAX_PHOTO_BYTES))).toBeNull();
    });

    it('CP-RF11-05: rejects a JPEG one byte over 5 MB', () => {
      expect(validateDentistPhoto(photo('image/jpeg', MAX_PHOTO_BYTES + 1))).toBe(
        'La imagen no puede superar 5 MB.',
      );
    });

    it('CP-RF11-06: rejects a PDF even when it is named like an image', () => {
      expect(validateDentistPhoto(photo('application/pdf', 1024))).toBe(
        'La imagen debe ser JPG, PNG o WebP.',
      );
    });

    it('accepts PNG and WebP', () => {
      expect(validateDentistPhoto(photo('image/png', 1024))).toBeNull();
      expect(validateDentistPhoto(photo('image/webp', 1024))).toBeNull();
    });

    it('accepts the absence of a chosen file', () => {
      expect(validateDentistPhoto(null)).toBeNull();
    });
  });

  describe('composeFullName', () => {
    it('CP-RF11-03: joins the present parts without double spaces', () => {
      expect(composeFullName({ ...VALID, secondName: '', secondSurname: '' })).toBe(
        'Laura Villamizar',
      );
      expect(composeFullName({ ...VALID, secondName: '  ', secondSurname: 'Rojas ' })).toBe(
        'Laura Villamizar Rojas',
      );
    });

    it('keeps all four parts in order', () => {
      expect(composeFullName(VALID)).toBe('Laura María Villamizar Rojas');
    });
  });

  it('counts description characters without trimming', () => {
    expect(descriptionLength('  hola  ')).toBe(8);
  });
});
