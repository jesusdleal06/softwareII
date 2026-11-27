import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { toApiError } from '../../../core/api/api-error';
import { AppStore } from '../../../core/services/app-store.service';

export type StaffAdminRole = 'AUXILIAR' | 'ODONTOLOGO';

/** One row of the admin staff panel. Dentist fields are null for auxiliares. */
export interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: StaffAdminRole;
  active: boolean;
  dentistId: number | null;
  specialty: string | null;
}

export interface CreateStaffPayload {
  name: string;
  email: string;
  password: string;
  role: StaffAdminRole;
  specialty?: string;
}

export interface UpdateStaffPayload {
  name: string;
  email: string;
  specialty?: string;
}

/**
 * Admin staff endpoints. Kept in the staff feature because the panel is the only
 * consumer; the shared `ClinicApi` stays untouched.
 */
@Injectable({ providedIn: 'root' })
export class StaffAdminApi {
  private readonly http = inject(HttpClient);
  private readonly store = inject(AppStore);

  list(): Promise<StaffMember[]> {
    return this.request(this.http.get<StaffMember[]>('/api/v1/staff', this.auth()));
  }

  create(payload: CreateStaffPayload): Promise<StaffMember> {
    return this.request(this.http.post<StaffMember>('/api/v1/staff', payload, this.auth()));
  }

  update(id: number, payload: UpdateStaffPayload): Promise<StaffMember> {
    return this.request(this.http.put<StaffMember>(`/api/v1/staff/${id}`, payload, this.auth()));
  }

  setActive(id: number, active: boolean): Promise<StaffMember> {
    const action = active ? 'activar' : 'desactivar';
    return this.request(this.http.patch<StaffMember>(`/api/v1/staff/${id}/${action}`, {}, this.auth()));
  }

  private auth(): { headers: HttpHeaders } {
    const token = this.store.session()?.token;
    return {
      headers: token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders(),
    };
  }

  private async request<T>(call: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(call);
    } catch (error) {
      throw toApiError(error);
    }
  }
}
