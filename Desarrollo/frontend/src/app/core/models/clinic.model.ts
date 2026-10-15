export interface Clinic {
  name: string;
  shortName: string;
  address: string;
  phone: string;
  whatsapp: string;
}

/** Working shift, bounds in minutes from midnight (`end` exclusive). */
export interface Shift {
  name: string;
  start: number;
  end: number;
}
