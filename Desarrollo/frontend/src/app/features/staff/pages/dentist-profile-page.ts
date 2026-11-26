import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ApiError } from '../../../core/api/api-error';
import { DentistProfilePayload } from '../../../core/api/api.types';
import { DentistProfile, DentistProfileForm } from '../../../core/models';
import { AppStore } from '../../../core/services/app-store.service';
import {
  DentistProfileErrors,
  MAX_DESCRIPTION_LENGTH,
  composeFullName,
  validateDentistPhoto,
  validateDentistProfile,
} from '../../../core/domain';
import { AlertMessage } from '../../../shared/ui/alert-message';
import { BigButton } from '../../../shared/ui/big-button';
import { TextField, TextareaField } from '../../../shared/ui/field';

const EMPTY_FORM: DentistProfileForm = {
  firstName: '',
  secondName: '',
  firstSurname: '',
  secondSurname: '',
  academicTitles: [''],
  description: '',
};

/** Server `400` messages belong to the field the backend names. */
const SERVER_FIELD_ERRORS: Record<string, keyof DentistProfileErrors> = {
  'El primer nombre es obligatorio.': 'firstName',
  'El primer apellido es obligatorio.': 'firstSurname',
  'Agrega al menos un título académico.': 'academicTitles',
  'La descripción es obligatoria.': 'description',
  'La descripción no puede superar 500 caracteres.': 'description',
};

const LOAD_ERROR = 'No pudimos cargar tu perfil. Intenta de nuevo.';
const PHOTO_FAILURE = 'No pudimos subir la imagen. Intenta de nuevo.';

/**
 * «Mi perfil» page: the signed-in dentist edits the fields patients see in the public
 * booking flow. Validation lives in `core/domain/dentist-profile`; this page only binds it.
 */
@Component({
  selector: 'app-dentist-profile-page',
  imports: [TextField, TextareaField, BigButton, AlertMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  template: `
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-bold tracking-tight">Mi perfil</h1>
      <p class="text-base text-muted-foreground">
        Estos datos aparecen en el sitio público cuando tus pacientes eligen su odontólogo.
      </p>
    </div>

    @if (loading()) {
      <p role="status" class="text-base text-muted-foreground">Cargando tu perfil…</p>
    } @else if (loadError()) {
      <p appAlertMessage>{{ loadError() }}</p>
    } @else {
      <form class="flex max-w-3xl flex-col gap-6" (submit)="save($event)" novalidate>
        <div class="grid gap-4 sm:grid-cols-2">
          <app-text-field
            fieldId="perfil-primer-nombre"
            label="Primer nombre"
            autocomplete="given-name"
            [required]="true"
            [value]="form().firstName"
            [error]="errors().firstName"
            (valueChange)="patch('firstName', $event)"
          />
          <app-text-field
            fieldId="perfil-segundo-nombre"
            label="Segundo nombre"
            autocomplete="additional-name"
            [value]="form().secondName"
            (valueChange)="patch('secondName', $event)"
          />
          <app-text-field
            fieldId="perfil-primer-apellido"
            label="Primer apellido"
            autocomplete="family-name"
            [required]="true"
            [value]="form().firstSurname"
            [error]="errors().firstSurname"
            (valueChange)="patch('firstSurname', $event)"
          />
          <app-text-field
            fieldId="perfil-segundo-apellido"
            label="Segundo apellido"
            autocomplete="family-name"
            [value]="form().secondSurname"
            (valueChange)="patch('secondSurname', $event)"
          />
        </div>

        <fieldset class="flex flex-col gap-3">
          <legend class="text-base font-semibold text-foreground">Títulos académicos</legend>
          @for (title of form().academicTitles; track $index) {
            <div class="flex items-end gap-2">
              <app-text-field
                class="flex-1"
                [fieldId]="'perfil-titulo-' + $index"
                [label]="'Título académico ' + ($index + 1)"
                [value]="title"
                [error]="$index === 0 ? errors().academicTitles : undefined"
                (valueChange)="setTitle($index, $event)"
              />
              <button
                type="button"
                appBigButton
                variant="ghost"
                size="md"
                [disabled]="form().academicTitles.length === 1"
                [attr.aria-label]="'Quitar título académico ' + ($index + 1)"
                (click)="removeTitle($index)"
              >
                Quitar
              </button>
            </div>
          }
          <div>
            <button type="button" appBigButton variant="outline" size="md" (click)="addTitle()">
              Agregar título
            </button>
          </div>
        </fieldset>

        <app-textarea-field
          fieldId="perfil-descripcion"
          label="Breve descripción"
          [rows]="5"
          [required]="true"
          [maxLength]="MAX_DESCRIPTION_LENGTH"
          [value]="form().description"
          [error]="errors().description"
          [counter]="descriptionLength(form().description) + '/500 caracteres'"
          (valueChange)="patch('description', $event)"
        />

        <fieldset class="flex flex-col gap-3">
          <legend class="text-base font-semibold text-foreground">Foto de perfil</legend>
          <div class="flex flex-wrap items-center gap-4">
            @if (photoPreview() || photoUrl()) {
              <img
                [src]="photoPreview() ?? photoUrl()"
                alt="Vista previa de tu foto de perfil"
                class="size-24 rounded-full border object-cover"
              />
            } @else {
              <span
                class="flex size-24 items-center justify-center rounded-full bg-secondary text-2xl font-bold text-secondary-foreground"
                aria-hidden="true"
              >
                {{ initials() }}
              </span>
            }
            <div class="flex flex-col gap-2">
              <label for="perfil-foto" class="text-base font-semibold text-foreground">Elegir foto</label>
              <input
                id="perfil-foto"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="text-base file:mr-3 file:rounded-xl file:border file:bg-card file:px-4 file:py-2 file:text-base file:font-semibold hover:file:bg-muted"
                [attr.aria-invalid]="!!photoError()"
                [attr.aria-describedby]="photoError() ? 'perfil-foto-error' : null"
                (change)="onPhotoSelected($event)"
              />
              <p class="text-sm text-muted-foreground">JPG, PNG o WebP. Máximo 5 MB.</p>
              <div>
                <button
                  type="button"
                  appBigButton
                  variant="outline"
                  size="md"
                  [disabled]="!chosenPhoto() || uploading()"
                  (click)="uploadPhoto()"
                >
                  {{ uploading() ? 'Subiendo…' : 'Subir foto' }}
                </button>
              </div>
            </div>
          </div>
          @if (photoError()) {
            <p id="perfil-foto-error" role="alert" class="text-base font-medium text-destructive">
              {{ photoError() }}
            </p>
          }
        </fieldset>

        @if (submitError()) {
          <p appAlertMessage>{{ submitError() }}</p>
        }
        @if (notice()) {
          <p role="status" class="text-base font-medium text-primary">{{ notice() }}</p>
        }

        <div class="flex flex-wrap items-center gap-3">
          <button type="submit" appBigButton size="lg" [disabled]="saving()">
            {{ saving() ? 'Guardando…' : 'Guardar cambios' }}
          </button>
          <span class="text-sm text-muted-foreground">
            {{ composeFullName(form()) }}
          </span>
        </div>
      </form>
    }
  `,
})
export class DentistProfilePage implements OnInit {
  private readonly store = inject(AppStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly MAX_DESCRIPTION_LENGTH = MAX_DESCRIPTION_LENGTH;
  protected readonly composeFullName = composeFullName;
  protected readonly descriptionLength = (value: string): number => value.length;

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly form = signal<DentistProfileForm>({ ...EMPTY_FORM });
  protected readonly errors = signal<DentistProfileErrors>({});
  protected readonly photoUrl = signal<string | null>(null);
  protected readonly photoPreview = signal<string | null>(null);
  protected readonly photoError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly submitError = signal<string | null>(null);
  protected readonly chosenPhoto = signal<File | null>(null);

  protected readonly initials = computed(() =>
    [this.form().firstName, this.form().firstSurname]
      .map((part) => part.trim().charAt(0))
      .join('')
      .toUpperCase(),
  );

  async ngOnInit(): Promise<void> {
    try {
      this.applyProfile(await this.store.dentistProfile());
    } catch (error) {
      this.loadError.set(error instanceof ApiError ? error.message : LOAD_ERROR);
    } finally {
      this.loading.set(false);
    }
  }

  protected patch(field: 'firstName' | 'secondName' | 'firstSurname' | 'secondSurname' | 'description', value: string): void {
    this.form.update((form) => ({ ...form, [field]: value }));
    this.clearError(field);
  }

  protected setTitle(index: number, value: string): void {
    this.form.update((form) => ({
      ...form,
      academicTitles: form.academicTitles.map((title, i) => (i === index ? value : title)),
    }));
    this.clearError('academicTitles');
  }

  protected addTitle(): void {
    this.form.update((form) => ({ ...form, academicTitles: [...form.academicTitles, ''] }));
  }

  protected removeTitle(index: number): void {
    this.form.update((form) => ({
      ...form,
      academicTitles: form.academicTitles.filter((_, i) => i !== index),
    }));
  }

  protected onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    const error = validateDentistPhoto(file);
    this.photoError.set(error);
    this.notice.set(null);
    if (!file || error) {
      this.chosenPhoto.set(null);
      this.photoPreview.set(null);
      return;
    }
    this.chosenPhoto.set(file);
    this.photoPreview.set(
      typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null,
    );
  }

  async uploadPhoto(): Promise<void> {
    const file = this.chosenPhoto();
    if (!file) return;
    const error = validateDentistPhoto(file);
    if (error) {
      this.photoError.set(error);
      return;
    }
    this.uploading.set(true);
    this.photoError.set(null);
    this.notice.set(null);
    this.submitError.set(null);
    try {
      const profile = await this.store.uploadDentistPhoto(file);
      this.applyProfile(profile);
      this.notice.set('Actualizaste tu foto de perfil.');
    } catch (caught) {
      this.photoPreview.set(null);
      this.chosenPhoto.set(null);
      this.photoError.set(
        caught instanceof ApiError && caught.status === 502 ? PHOTO_FAILURE : (caught as Error).message,
      );
      this.focusFirstInvalid();
    } finally {
      this.uploading.set(false);
    }
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    this.notice.set(null);
    this.submitError.set(null);
    const form = this.form();
    const errors = validateDentistProfile(form);
    this.errors.set(errors);
    if (Object.keys(errors).length > 0) {
      this.focusFirstInvalid();
      return;
    }
    this.saving.set(true);
    try {
      const saved = await this.store.saveDentistProfile(this.toPayload(form));
      this.applyProfile(saved);
      this.notice.set('Guardaste los cambios de tu perfil.');
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 400) {
        const field = SERVER_FIELD_ERRORS[caught.message];
        if (field) {
          this.errors.update((current) => ({ ...current, [field]: caught.message }));
          this.focusFirstInvalid();
        } else {
          this.submitError.set(caught.message);
        }
      } else {
        this.submitError.set(
          caught instanceof ApiError ? caught.message : 'No pudimos guardar tu perfil. Intenta de nuevo.',
        );
      }
    } finally {
      this.saving.set(false);
    }
  }

  private toPayload(form: DentistProfileForm): DentistProfilePayload {
    return {
      firstName: form.firstName.trim(),
      secondName: form.secondName.trim() || null,
      firstSurname: form.firstSurname.trim(),
      secondSurname: form.secondSurname.trim() || null,
      academicTitles: form.academicTitles.map((title) => title.trim()).filter((title) => title.length > 0),
      description: form.description.trim(),
    };
  }

  private applyProfile(profile: DentistProfile): void {
    this.form.set({
      firstName: profile.firstName,
      secondName: profile.secondName ?? '',
      firstSurname: profile.firstSurname,
      secondSurname: profile.secondSurname ?? '',
      academicTitles: profile.academicTitles.length > 0 ? [...profile.academicTitles] : [''],
      description: profile.description,
    });
    this.photoUrl.set(profile.photoUrl);
    this.photoPreview.set(null);
    this.chosenPhoto.set(null);
  }

  private clearError(field: string): void {
    const key = field as keyof DentistProfileErrors;
    if (!this.errors()[key]) return;
    this.errors.update((errors) => {
      const next = { ...errors };
      delete next[key];
      return next;
    });
  }

  private focusFirstInvalid(): void {
    setTimeout(() => {
      this.host.nativeElement
        .querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')
        ?.focus();
    });
  }
}
