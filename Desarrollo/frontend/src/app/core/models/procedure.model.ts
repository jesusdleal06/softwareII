export interface Procedure {
  id: string;
  name: string;
  /** Duration in minutes. */
  durationMinutes: number;
  /**
   * Dentists who perform the procedure. Empty when the catalog entry has no
   * explicit assignment, which keeps legacy entries available to every dentist.
   */
  dentistIds?: string[];
}
