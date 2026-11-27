import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ApiError } from '../../../core/api/api-error';
import { BigButton } from '../../../shared/ui/big-button';
import { cn } from '../../../shared/ui/class-names';
import { SelectField, SelectOption, TextField } from '../../../shared/ui/field';
import {
  CreateStaffPayload,
  StaffAdminApi,
  StaffAdminRole,
  StaffMember,
  UpdateStaffPayload,
} from '../data/staff-admin-api';

const ROLE_OPTIONS: readonly SelectOption[] = [
  { value: 'AUXILIAR', label: 'Auxiliar administrativa' },
  { value: 'ODONTOLOGO', label: 'Odontólogo' },
];

/** Admin panel: add, edit, deactivate and reactivate the clinic staff. */
@Component({
  selector: 'app-admin-staff-page',
  imports: [BigButton, TextField, SelectField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  template: `
    <div class="page-header">
      <h1 class="page-title">Personal</h1>
      <p class="page-subtitle text-pretty">
        Agrega, edita y desactiva las cuentas del personal. "Eliminar" desactiva sin borrar el historial.
      </p>
    </div>

    @if (notice()) {
      <p role="status" class="rounded-md border border-success/40 bg-success/10 px-4 py-3 text-sm font-medium">
        {{ notice() }}
      </p>
    }

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <section class="card flex flex-col gap-4" aria-labelledby="staff-list-title">
        <h2 id="staff-list-title" class="text-xl font-bold">Equipo</h2>

        @if (loading()) {
          <p role="status" class="text-sm text-muted-foreground">Cargando el personal…</p>
        } @else if (listError()) {
          <div class="flex flex-col items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-5">
            <p class="text-sm font-semibold">{{ listError() }}</p>
            <button type="button" appBigButton variant="secondary" size="md" (click)="load()">Reintentar</button>
          </div>
        } @else if (members().length === 0) {
          <p class="text-sm text-muted-foreground">Aún no hay cuentas registradas.</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full border-collapse text-left text-sm">
              <caption class="sr-only">Personal de la clínica</caption>
              <thead>
                <tr class="border-b text-muted-foreground">
                  <th scope="col" class="px-2 py-2 font-semibold">Nombre</th>
                  <th scope="col" class="px-2 py-2 font-semibold">Correo</th>
                  <th scope="col" class="px-2 py-2 font-semibold">Rol</th>
                  <th scope="col" class="px-2 py-2 font-semibold">Especialidad</th>
                  <th scope="col" class="px-2 py-2 font-semibold">Estado</th>
                  <th scope="col" class="px-2 py-2"><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (member of members(); track member.id) {
                  <tr class="border-b align-top last:border-0">
                    <td class="px-2 py-3 font-medium">{{ member.name }}</td>
                    <td class="px-2 py-3 break-all">{{ member.email }}</td>
                    <td class="px-2 py-3">{{ roleLabel(member.role) }}</td>
                    <td class="px-2 py-3">{{ member.specialty ?? '—' }}</td>
                    <td class="px-2 py-3">
                      <span
                        [class]="
                          cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                            member.active
                              ? 'bg-success/15 text-success-foreground'
                              : 'bg-muted text-muted-foreground'
                          )
                        "
                      >
                        {{ member.active ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td class="px-2 py-3">
                      <div class="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          appBigButton
                          variant="secondary"
                          size="md"
                          (click)="startEdit(member)"
                          [attr.aria-label]="'Editar a ' + member.name"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          appBigButton
                          [variant]="member.active ? 'danger' : 'success'"
                          size="md"
                          (click)="askToggle(member)"
                          [attr.aria-label]="(member.active ? 'Desactivar a ' : 'Reactivar a ') + member.name"
                        >
                          {{ member.active ? 'Desactivar' : 'Reactivar' }}
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (pending(); as confirmation) {
          <div
            class="flex flex-col gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-4"
            role="alertdialog"
            aria-labelledby="confirm-title"
          >
            <p id="confirm-title" class="text-sm font-semibold">
              ¿{{ confirmation.active ? 'Reactivar' : 'Desactivar' }} a {{ confirmation.member.name }}?
            </p>
            <p class="text-xs text-muted-foreground">
              {{
                confirmation.active
                  ? 'La cuenta podrá volver a ingresar y el odontólogo aparecerá en la agenda pública.'
                  : 'La cuenta no podrá ingresar y el odontólogo dejará de aparecer en la agenda pública.'
              }}
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                appBigButton
                [variant]="confirmation.active ? 'success' : 'danger'"
                size="md"
                (click)="confirmToggle()"
                [disabled]="saving()"
              >
                Sí, {{ confirmation.active ? 'reactivar' : 'desactivar' }}
              </button>
              <button type="button" appBigButton variant="secondary" size="md" (click)="cancelToggle()">
                Cancelar
              </button>
            </div>
          </div>
        }
      </section>

      <section class="card flex flex-col gap-4" aria-labelledby="staff-form-title">
        <div class="flex flex-col gap-1">
          <h2 id="staff-form-title" class="text-xl font-bold">{{ editingId() === null ? 'Agregar personal' : 'Editar personal' }}</h2>
          <p class="text-xs text-muted-foreground">
            {{ editingId() === null ? 'La cuenta y su ficha se crean juntas.' : 'Actualiza el nombre, el correo y la especialidad.' }}
          </p>
        </div>

        @if (formError()) {
          <p role="alert" class="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {{ formError() }}
          </p>
        }

        <app-text-field
          data-testid="staff-name"
          fieldId="staff-name"
          label="Nombre"
          [value]="name()"
          [required]="true"
          (valueChange)="name.set($event)"
        />
        <app-text-field
          data-testid="staff-email"
          fieldId="staff-email"
          label="Correo"
          type="email"
          [value]="email()"
          [required]="true"
          (valueChange)="email.set($event)"
        />
        @if (editingId() === null) {
          <app-text-field
            data-testid="staff-password"
            fieldId="staff-password"
            label="Contraseña"
            type="password"
            [value]="password()"
            [required]="true"
            (valueChange)="password.set($event)"
          />
          <app-select-field
            data-testid="staff-role"
            fieldId="staff-role"
            label="Rol"
            [options]="roleOptions"
            [value]="role()"
            [required]="true"
            (valueChange)="setRole($event)"
          />
        } @else {
          <p class="text-sm text-muted-foreground">Rol: {{ roleLabel(role()) }}</p>
        }
        @if (isDentist()) {
          <app-text-field
            data-testid="staff-specialty"
            fieldId="staff-specialty"
            label="Especialidad"
            [value]="specialty()"
            [required]="true"
            (valueChange)="specialty.set($event)"
          />
        }

        <div class="flex flex-wrap gap-2">
          <button type="button" appBigButton size="md" (click)="submit()" [disabled]="saving()">
            {{ saving() ? 'Guardando…' : editingId() === null ? 'Agregar' : 'Guardar cambios' }}
          </button>
          @if (editingId() !== null) {
            <button type="button" appBigButton variant="secondary" size="md" (click)="resetForm()">
              Cancelar
            </button>
          }
        </div>
      </section>
    </div>
  `,
})
export class AdminStaffPage {
  private readonly api = inject(StaffAdminApi);

  readonly roleOptions = ROLE_OPTIONS;
  readonly members = signal<StaffMember[]>([]);
  readonly loading = signal(true);
  readonly listError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly pending = signal<{ member: StaffMember; active: boolean } | null>(null);

  readonly editingId = signal<number | null>(null);
  readonly name = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly role = signal<StaffAdminRole>('AUXILIAR');
  readonly specialty = signal('');

  readonly isDentist = computed(() => this.role() === 'ODONTOLOGO');

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.listError.set(null);
    try {
      this.members.set(await this.api.list());
    } catch (error) {
      this.listError.set(this.messageOf(error));
    } finally {
      this.loading.set(false);
    }
  }

  setRole(value: string): void {
    this.role.set(value === 'ODONTOLOGO' ? 'ODONTOLOGO' : 'AUXILIAR');
    if (!this.isDentist()) this.specialty.set('');
  }

  startEdit(member: StaffMember): void {
    this.editingId.set(member.id);
    this.name.set(member.name);
    this.email.set(member.email);
    this.role.set(member.role);
    this.specialty.set(member.specialty ?? '');
    this.password.set('');
    this.formError.set(null);
    this.pending.set(null);
  }

  resetForm(): void {
    this.editingId.set(null);
    this.name.set('');
    this.email.set('');
    this.password.set('');
    this.role.set('AUXILIAR');
    this.specialty.set('');
    this.formError.set(null);
  }

  async submit(): Promise<void> {
    this.formError.set(null);
    this.notice.set(null);
    const name = this.name().trim();
    const email = this.email().trim();
    const specialty = this.specialty().trim();
    if (!name || !email) {
      this.formError.set('El nombre y el correo son obligatorios.');
      return;
    }
    if (this.isDentist() && !specialty) {
      this.formError.set('La especialidad es obligatoria para un odontólogo.');
      return;
    }
    if (this.editingId() === null && !this.password().trim()) {
      this.formError.set('La contraseña es obligatoria.');
      return;
    }

    this.saving.set(true);
    try {
      if (this.editingId() === null) {
        const payload: CreateStaffPayload = {
          name,
          email,
          password: this.password(),
          role: this.role(),
          ...(this.isDentist() ? { specialty } : {}),
        };
        await this.api.create(payload);
        this.notice.set('Se agregó la cuenta al personal.');
      } else {
        const payload: UpdateStaffPayload = {
          name,
          email,
          ...(this.isDentist() ? { specialty } : {}),
        };
        await this.api.update(this.editingId() as number, payload);
        this.notice.set('Se guardaron los cambios.');
      }
      this.resetForm();
      await this.load();
    } catch (error) {
      this.formError.set(this.messageOf(error));
    } finally {
      this.saving.set(false);
    }
  }

  askToggle(member: StaffMember): void {
    this.pending.set({ member, active: !member.active });
  }

  cancelToggle(): void {
    this.pending.set(null);
  }

  async confirmToggle(): Promise<void> {
    const confirmation = this.pending();
    if (!confirmation) return;
    this.saving.set(true);
    this.formError.set(null);
    this.notice.set(null);
    try {
      await this.api.setActive(confirmation.member.id, confirmation.active);
      this.notice.set(
        confirmation.active ? 'Se reactivó la cuenta.' : 'Se desactivó la cuenta sin borrar su historial.',
      );
      this.pending.set(null);
      await this.load();
    } catch (error) {
      this.formError.set(this.messageOf(error));
      this.pending.set(null);
    } finally {
      this.saving.set(false);
    }
  }

  roleLabel(role: StaffAdminRole): string {
    return role === 'ODONTOLOGO' ? 'Odontólogo' : 'Auxiliar administrativa';
  }

  protected readonly cn = cn;

  private messageOf(error: unknown): string {
    return error instanceof ApiError ? error.message : 'No se pudo completar la solicitud.';
  }
}
