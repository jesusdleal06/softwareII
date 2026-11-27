import { mapDentistProfile } from './adapters';
import { DentistProfileDto } from './api.types';

describe('mapDentistProfile', () => {
  // Dentists that existed before migration V5 have no description, titles or photo yet;
  // the profile page counts the description's characters, so it must never get null.
  const MIGRATED: DentistProfileDto = {
    id: 1,
    firstName: 'Laura',
    secondName: null,
    firstSurname: 'Villamizar',
    secondSurname: null,
    fullName: 'Laura Villamizar',
    specialty: 'Odontología general',
    photoUrl: null,
    academicTitles: null,
    description: null,
  };

  it('maps a dentist migrated without description or titles to empty values', () => {
    const profile = mapDentistProfile(MIGRATED);
    expect(profile.description).toBe('');
    expect(profile.academicTitles).toEqual([]);
    expect(profile.photoUrl).toBeNull();
    expect(profile.fullName).toBe('Laura Villamizar');
  });

  it('keeps a complete profile as sent by the API', () => {
    const profile = mapDentistProfile({
      ...MIGRATED,
      academicTitles: ['Ortodoncia'],
      description: 'Odontóloga especialista en ortodoncia.',
    });
    expect(profile.description).toBe('Odontóloga especialista en ortodoncia.');
    expect(profile.academicTitles).toEqual(['Ortodoncia']);
  });
});
