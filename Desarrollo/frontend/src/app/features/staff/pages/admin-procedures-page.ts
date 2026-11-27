import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { AdminProcedureDto } from '../../../core/api/clinic-api';
import { Dentist } from '../../../core/models';
import { AppStore } from '../../../core/services/app-store.service';
import { AlertMessage } from '../../../shared/ui/alert-message';
import { BigButton } from '../../../shared/ui/big-button';
import { SelectField, SelectOption, TextField } from '../../../shared/ui/field';
import { ProceduresAdminApi } from '../data/procedures-admin-api';

const DURATION_OPTIONS: readonly SelectOption[] = [
  { value: '30', label: '30 minutos' },
  { value: '45', label: '45 minutos' },
  { value: '60', label: '60 minutos' },
  { value: '90', label: '90 minutos' },
];

const NAME_REQUIRED = 'El nombre del procedimiento es obligatorio.';
const DENTIST_REQUIRED = 'Seleccione al menos un odontólogo.';

@Component({
  selector: 'app-admin-procedures-page',
  imports: [AlertMessage, BigButton, SelectField, TextField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  template: `
    <div class="page-header flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="page-title">Procedimientos</h1>
        <p class="page-subtitle text-pretty">
          Crea los procedimientos de la clínica y define qué odontólogos los realizan.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          appBigButton
          variant="outline"
          size="md"
          [disabled]="loading()"
          (click)="reload()"
        >
          Actualizar
        </button>
      </div>
    </div>

    @if (error()) {
      <p appAlertMessage>{{ error() }}</p>
    }

    <section class="card flex flex-col gap-4" aria-labelledby="procedimientos-nuevo">
      <div>
        <h2 id="procedimientos-nuevo" class="text-base font-semibold text-foreground">
          Nuevo procedimiento
        </h2>
        <p class="mt-0.5 text-sm text-muted-foreground">
          Todo procedimiento debe tener al menos un odontólogo activo.
        </p>
      </div>

      <form class="flex flex-col gap-4" (submit)="save($event)" novalidate>
        <div class="grid gap-4 sm:grid-cols-2">
          <app-text-field
            fieldId="procedimiento-nombre"
            label="Nombre"
            inputClass="h-11 sm:h-10"
            [required]="true"
            [value]="name()"
            [error]="nameError() ?? undefined"
            (valueChange)="setName($event)"
          />
          <app-select-field
            fieldId="procedimiento-duracion"
            label="Duración"
            [options]="durationOptions"
            [value]="durationValue()"
            (valueChange)="setDuration($event)"
          />
        </div>

        <fieldset class="flex flex-col gap-2">
          <legend class="text-sm font-medium text-foreground">Odontólogos</legend>
          @if (dentists().length === 0) {
            <p class="text-sm text-muted-foreground">No hay odontólogos activos disponibles.</p>
          } @else {
            <ul class="flex flex-wrap gap-x-4 gap-y-2">
              @for (dentist of dentists(); track dentist.id) {
                <li>
                  <label class="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      class="size-4 rounded-sm border border-border"
                      [checked]="selectedDentistIds().includes(dentist.id)"
                      (change)="toggleSelected(dentist.id)"
                    />
                    {{ dentist.name }}
                  </label>
                </li>
              }
            </ul>
          }
          @if (dentistError()) {
            <p appAlertMessage>{{ dentistError() }}</p>
          }
        </fieldset>

        @if (formError()) {
          <p appAlertMessage>{{ formError() }}</p>
        }

        <div class="flex justify-end">
          <button type="submit" appBigButton size="md" [disabled]="saving()">
            Guardar procedimiento
          </button>
        </div>
      </form>
    </section>

    <section class="card flex flex-col gap-4" aria-labelledby="procedimientos-lista">
      <div>
        <h2 id="procedimientos-lista" class="text-base font-semibold text-foreground">
          Procedimientos registrados
        </h2>
        <p class="mt-0.5 text-sm text-muted-foreground">
          Ajusta los odontólogos de cada procedimiento y actívalo o desactívalo.
        </p>
      </div>

      @if (loading()) {
        <p role="status" class="text-sm text-muted-foreground">Cargando procedimientos…</p>
      } @else if (procedures().length === 0) {
        <p role="status" class="card text-center text-sm text-muted-foreground">
          Aún no hay procedimientos registrados.
        </p>
      } @else {
        <ul class="flex flex-col gap-4">
          @for (procedure of procedures(); track procedure.id) {
            <li class="flex flex-col gap-3 rounded-md border border-border p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 class="text-base font-semibold text-foreground">{{ procedure.name }}</h3>
                  <p class="text-sm text-muted-foreground">
                    {{ procedure.durationMinutes }} min ·
                    {{ procedure.active ? 'Activo' : 'Inactivo' }}
                  </p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    appBigButton
                    variant="outline"
                    size="md"
                    (click)="startEditing(procedure)"
                  >
                    Editar odontólogos
                  </button>
                  @if (procedure.active) {
                    <button
                      type="button"
                      appBigButton
                      variant="danger"
                      size="md"
                      [disabled]="saving()"
                      (click)="setActive(procedure, false)"
                    >
                      Desactivar
                    </button>
                  } @else {
                    <button
                      type="button"
                      appBigButton
                      variant="success"
                      size="md"
                      [disabled]="saving()"
                      (click)="setActive(procedure, true)"
                    >
                      Activar
                    </button>
                  }
                </div>
              </div>

              <p class="text-sm text-muted-foreground">{{ dentistNames(procedure) }}</p>

              @if (editingId() === procedure.id) {
                <div class="flex flex-col gap-3 border-t border-border pt-3">
                  <ul class="flex flex-wrap gap-x-4 gap-y-2">
                    @for (dentist of dentists(); track dentist.id) {
                      <li>
                        <label class="flex items-center gap-2 text-sm text-foreground">
                          <input
                            type="checkbox"
                            class="size-4 rounded-sm border border-border"
                            [checked]="editingDentistIds().includes(dentist.id)"
                            (change)="toggleEditing(dentist.id)"
                          />
                          {{ dentist.name }}
                        </label>
                      </li>
                    }
                  </ul>
                  @if (editError()) {
                    <p appAlertMessage>{{ editError() }}</p>
                  }
                  <div class="flex justify-end gap-2">
                    <button
                      type="button"
                      appBigButton
                      variant="ghost"
                      size="md"
                      (click)="cancelEditing()"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      appBigButton
                      size="md"
                      [disabled]="saving()"
                      (click)="saveDentists(procedure)"
                    >
                      Guardar odontólogos
                    </button>
                  </div>
                </div>
              }
            </li>
          }
        </ul>
      }

      @if (notice()) {
        <p role="status" class="text-xs text-muted-foreground">{{ notice() }}</p>
      }
    </section>
  `,
})
export class AdminProceduresPage implements OnInit {
  private readonly api = inject(ProceduresAdminApi);
  private readonly store = inject(AppStore);

  protected readonly procedures = this.api.procedures;
  protected readonly dentists = this.store.dentists;
  protected readonly loading = this.api.loading;
  protected readonly saving = this.api.saving;
  protected readonly error = this.api.error;

  protected readonly durationOptions = DURATION_OPTIONS;

  protected readonly name = signal('');
  protected readonly duration = signal(30);
  protected readonly selectedDentistIds = signal<readonly string[]>([]);
  protected readonly nameError = signal<string | null>(null);
  protected readonly dentistError = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);

  protected readonly editingId = signal<number | null>(null);
  protected readonly editingDentistIds = signal<readonly string[]>([]);
  protected readonly editError = signal<string | null>(null);

  protected readonly notice = signal<string | null>(null);

  protected readonly durationValue = computed(() => String(this.duration()));

  ngOnInit(): void {
    void this.store.ensureCatalogs();
    void this.api.load();
  }

  protected reload(): void {
    void this.api.load();
  }

  protected setName(value: string): void {
    this.name.set(value);
    this.nameError.set(null);
    this.formError.set(null);
  }

  protected setDuration(value: string): void {
    this.duration.set(Number(value));
  }

  protected toggleSelected(dentistId: string): void {
    this.selectedDentistIds.update((ids) =>
      ids.includes(dentistId) ? ids.filter((id) => id !== dentistId) : [...ids, dentistId],
    );
    this.dentistError.set(null);
    this.formError.set(null);
  }

  protected save(event: Event): void {
    event.preventDefault();
    this.notice.set(null);

    const name = this.name().trim();
    const dentistIds = this.selectedDentistIds();

    this.nameError.set(name.length === 0 ? NAME_REQUIRED : null);
    this.dentistError.set(dentistIds.length === 0 ? DENTIST_REQUIRED : null);
    if (!name || dentistIds.length === 0) return;

    void this.api
      .create({
        name,
        durationMinutes: this.duration(),
        dentistIds: dentistIds.map(Number),
      })
      .then((saved) => {
        if (!saved) {
          this.formError.set(this.api.error());
          return;
        }
        this.name.set('');
        this.duration.set(30);
        this.selectedDentistIds.set([]);
        this.notice.set('Procedimiento guardado.');
      });
  }

  protected dentistNames(procedure: AdminProcedureDto): string {
    const byId = new Map(this.dentists().map((dentist) => [String(dentist.id), dentist]));
    const names = procedure.dentistIds
      .map((id) => byId.get(String(id))?.name)
      .filter((name): name is string => Boolean(name));
    if (names.length === 0) return 'Todos los odontólogos activos';
    return `Odontólogos: ${names.join(', ')}`;
  }

  protected startEditing(procedure: AdminProcedureDto): void {
    this.editingId.set(procedure.id);
    this.editingDentistIds.set(procedure.dentistIds.map(String));
    this.editError.set(null);
    this.notice.set(null);
  }

  protected cancelEditing(): void {
    this.editingId.set(null);
    this.editingDentistIds.set([]);
    this.editError.set(null);
  }

  protected toggleEditing(dentistId: string): void {
    this.editingDentistIds.update((ids) =>
      ids.includes(dentistId) ? ids.filter((id) => id !== dentistId) : [...ids, dentistId],
    );
    this.editError.set(null);
  }

  protected saveDentists(procedure: AdminProcedureDto): void {
    const dentistIds = this.editingDentistIds();
    if (dentistIds.length === 0) {
      this.editError.set(DENTIST_REQUIRED);
      return;
    }

    void this.api.updateDentists(procedure.id, dentistIds.map(Number)).then((saved) => {
      if (!saved) {
        this.editError.set(this.api.error());
        return;
      }
      this.cancelEditing();
      this.notice.set('Odontólogos actualizados.');
    });
  }

  protected setActive(procedure: AdminProcedureDto, active: boolean): void {
    this.notice.set(null);
    void this.api.setActive(procedure.id, active).then((saved) => {
      if (saved) this.notice.set(active ? 'Procedimiento activado.' : 'Procedimiento desactivado.');
    });
  }

  protected dentistLabel(dentist: Dentist): string {
    return dentist.name;
  }
}
