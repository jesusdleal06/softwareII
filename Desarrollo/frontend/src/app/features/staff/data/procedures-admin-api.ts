import { Injectable, inject, signal } from '@angular/core';

import { toApiError } from '../../../core/api/api-error';
import { AdminProcedureDto, ClinicApi, CreateProcedurePayload } from '../../../core/api/clinic-api';

/**
 * Admin view of the procedures catalog: list, creation, dentist assignment and
 * activation. Every mutation keeps the local list in sync with the API response.
 */
@Injectable({ providedIn: 'root' })
export class ProceduresAdminApi {
  private readonly api = inject(ClinicApi);

  private readonly proceduresState = signal<readonly AdminProcedureDto[]>([]);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly procedures = this.proceduresState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      this.proceduresState.set(await this.api.adminProcedures());
    } catch (error) {
      this.errorState.set(toApiError(error).message);
    } finally {
      this.loadingState.set(false);
    }
  }

  async create(payload: CreateProcedurePayload): Promise<boolean> {
    return this.mutate(async () => {
      const created = await this.api.createProcedure(payload);
      this.proceduresState.set(sort([...this.proceduresState(), created]));
      return true;
    });
  }

  async updateDentists(id: number, dentistIds: readonly number[]): Promise<boolean> {
    return this.mutate(async () => {
      const updated = await this.api.updateProcedureDentists(id, [...dentistIds]);
      this.replace(updated);
      return true;
    });
  }

  async setActive(id: number, active: boolean): Promise<boolean> {
    return this.mutate(async () => {
      const updated = await this.api.setProcedureActive(id, active);
      this.replace(updated);
      return true;
    });
  }

  private async mutate(action: () => Promise<boolean>): Promise<boolean> {
    this.savingState.set(true);
    this.errorState.set(null);
    try {
      return await action();
    } catch (error) {
      this.errorState.set(toApiError(error).message);
      return false;
    } finally {
      this.savingState.set(false);
    }
  }

  private replace(procedure: AdminProcedureDto): void {
    this.proceduresState.set(
      sort(this.proceduresState().map((item) => (item.id === procedure.id ? procedure : item))),
    );
  }
}

function sort(procedures: readonly AdminProcedureDto[]): readonly AdminProcedureDto[] {
  return [...procedures].sort((left, right) => left.name.localeCompare(right.name));
}
