import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { toApiError } from './api-error';
import {
  AvailabilityDto,
  DentistDto,
  LoginResponseDto,
  ManagedAppointmentDto,
  ProcedureDto,
  StaffDentistDto,
  PublicAppointmentDto,
  ReportDto,
  StaffAppointmentDto,
} from './api.types';

export interface BookAppointmentPayload {
  patientName: string;
  patientPhone: string;
  dentistId: number;
  procedureId: number;
  date: string;
  time: string;
}

export interface ReportQuery {
  from: string;
  to: string;
  dentistId?: string;
}

/** Thin HTTP client for `/api/v1`. Every failure is normalized to `ApiError`. */
@Injectable({ providedIn: 'root' })
export class ClinicApi {
  private readonly http = inject(HttpClient);
  private readonly bearer = signal<string | null>(null);

  setToken(token: string | null): void {
    this.bearer.set(token);
  }

  async login(email: string, password: string): Promise<LoginResponseDto> {
    return this.request(
      this.http.post<LoginResponseDto>('/api/v1/auth/login', { email, password }),
    );
  }

  async dentists(): Promise<DentistDto[]> {
    return this.request(this.http.get<DentistDto[]>('/api/v1/public/dentists'));
  }

  /** Staff catalog with the linked user ids; needs a staff token. */
  async staffDentists(): Promise<StaffDentistDto[]> {
    return this.request(this.http.get<StaffDentistDto[]>('/api/v1/dentists', { headers: this.auth() }));
  }

  async procedures(): Promise<ProcedureDto[]> {
    return this.request(this.http.get<ProcedureDto[]>('/api/v1/public/procedures'));
  }

  async availability(dentistId: string, procedureId: string, date: string): Promise<AvailabilityDto> {
    const params = new HttpParams()
      .set('dentistId', dentistId)
      .set('procedureId', procedureId)
      .set('date', date);
    return this.request(this.http.get<AvailabilityDto>('/api/v1/public/availability', { params }));
  }

  async bookPublic(payload: BookAppointmentPayload): Promise<PublicAppointmentDto> {
    return this.request(this.http.post<PublicAppointmentDto>('/api/v1/public/appointments', payload));
  }

  async managed(token: string): Promise<ManagedAppointmentDto> {
    return this.request(
      this.http.get<ManagedAppointmentDto>(`/api/v1/public/appointments/manage/${encodeURIComponent(token)}`),
    );
  }

  async confirmManaged(token: string): Promise<ManagedAppointmentDto> {
    return this.request(
      this.http.post<ManagedAppointmentDto>(
        `/api/v1/public/appointments/manage/${encodeURIComponent(token)}/confirm`,
        {},
      ),
    );
  }

  async cancelManaged(token: string): Promise<ManagedAppointmentDto> {
    return this.request(
      this.http.post<ManagedAppointmentDto>(
        `/api/v1/public/appointments/manage/${encodeURIComponent(token)}/cancel`,
        {},
      ),
    );
  }

  async rescheduleManaged(token: string, date: string, time: string): Promise<ManagedAppointmentDto> {
    return this.request(
      this.http.post<ManagedAppointmentDto>(
        `/api/v1/public/appointments/manage/${encodeURIComponent(token)}/reschedule`,
        { date, time },
      ),
    );
  }

  async agenda(date: string, dentistId?: string): Promise<StaffAppointmentDto[]> {
    let params = new HttpParams().set('date', date);
    if (dentistId) params = params.set('dentistId', dentistId);
    return this.request(
      this.http.get<StaffAppointmentDto[]>('/api/v1/appointments', { params, headers: this.auth() }),
    );
  }

  async bookStaff(payload: BookAppointmentPayload): Promise<StaffAppointmentDto> {
    return this.request(
      this.http.post<StaffAppointmentDto>('/api/v1/appointments', payload, { headers: this.auth() }),
    );
  }

  async changeStatus(id: string, status: string): Promise<StaffAppointmentDto> {
    return this.request(
      this.http.patch<StaffAppointmentDto>(`/api/v1/appointments/${id}/status`, { status }, { headers: this.auth() }),
    );
  }

  async rescheduleStaff(id: string, date: string, time: string): Promise<StaffAppointmentDto> {
    return this.request(
      this.http.patch<StaffAppointmentDto>(
        `/api/v1/appointments/${id}/reschedule`,
        { date, time },
        { headers: this.auth() },
      ),
    );
  }

  async report(query: ReportQuery): Promise<ReportDto> {
    return this.request(
      this.http.get<ReportDto>('/api/v1/reports', {
        params: this.reportParams(query),
        headers: this.auth(),
      }),
    );
  }

  async exportReport(query: ReportQuery): Promise<{ blob: Blob; filename: string }> {
    const response = await this.request(
      this.http.get('/api/v1/reports/export', {
        params: this.reportParams(query),
        headers: this.auth(),
        responseType: 'blob',
        observe: 'response',
      }),
    );
    return {
      blob: response.body ?? new Blob(),
      filename: this.filename(response) ?? `reporte-${query.from}-${query.to}.csv`,
    };
  }

  private auth(): HttpHeaders {
    const token = this.bearer();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private reportParams(query: ReportQuery): HttpParams {
    let params = new HttpParams().set('from', query.from).set('to', query.to);
    if (query.dentistId) params = params.set('dentistId', query.dentistId);
    return params;
  }

  private filename(response: HttpResponse<Blob>): string | null {
    const header = response.headers.get('content-disposition') ?? '';
    const match = /filename="?([^";]+)"?/i.exec(header);
    return match?.[1] ?? null;
  }

  private async request<T>(request: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(request);
    } catch (error) {
      throw toApiError(error);
    }
  }
}
