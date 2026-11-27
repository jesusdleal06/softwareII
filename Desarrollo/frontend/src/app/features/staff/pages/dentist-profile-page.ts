import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { LucideCircleCheck, LucidePlus, LucideX } from '@lucide/angular';
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
 *
 * The screen is organised as a profile-management surface: an identity header with a
 * completeness meter, one form card split into named sections, and a live preview of the
 * public dentist card beside it on desktop (after the form on phones).
 */
@Component({
  selector: 'app-dentist-profile-page',
  imports: [TextField, TextareaField, BigButton, AlertMessage, LucideCircleCheck, LucidePlus, LucideX],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  template: `
    <div class="page-header flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0">
        <h1 class="page-title">Mi perfil</h1>
        @if (identityLine()) {
          <p class="page-subtitle text-pretty">{{ identityLine() }}</p>
          <p class="mt-1 text-sm text-muted-foreground text-pretty">
            Así te ven tus pacientes cuando eligen odontólogo en la agenda pública.
          </p>
        } @else {
          <p class="page-subtitle text-pretty">
            Así te ven tus pacientes cuando eligen odontólogo en la agenda pública.
          </p>
        }
      </div>

      @if (!loading() && !loadError()) {
        <div class="flex w-full flex-col gap-2 sm:max-w-xs lg:w-64 lg:shrink-0">
          <div class="flex items-center justify-between gap-3 text-sm">
            <span class="font-medium text-foreground">Perfil</span>
            <span class="tabular-nums text-muted-foreground">{{ completeness().percent }}% completo</span>
          </div>
          <div
            class="h-1.5 w-full overflow-hidden rounded-full bg-accent"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            [attr.aria-valuenow]="completeness().percent"
            [attr.aria-label]="'Perfil ' + completeness().percent + '% completo'"
          >
            <div
              class="h-full rounded-full bg-primary transition-[width] duration-200"
              [style.width.%]="completeness().percent"
            ></div>
          </div>
        </div>
      }
    </div>

    @if (loading()) {
      <div class="flex flex-col gap-6" role="status" aria-live="polite">
        <span class="sr-only">Cargando tu perfil…</span>
        <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start" aria-hidden="true">
          <div class="card flex flex-col gap-6">
            <div class="flex flex-col gap-4">
              <div class="h-4 w-28 rounded-sm bg-accent"></div>
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="flex flex-col gap-2">
                  <div class="h-3 w-24 rounded-sm bg-accent"></div>
                  <div class="h-11 w-full rounded-md bg-accent"></div>
                </div>
                <div class="flex flex-col gap-2">
                  <div class="h-3 w-24 rounded-sm bg-accent"></div>
                  <div class="h-11 w-full rounded-md bg-accent"></div>
                </div>
                <div class="flex flex-col gap-2">
                  <div class="h-3 w-24 rounded-sm bg-accent"></div>
                  <div class="h-11 w-full rounded-md bg-accent"></div>
                </div>
                <div class="flex flex-col gap-2">
                  <div class="h-3 w-24 rounded-sm bg-accent"></div>
                  <div class="h-11 w-full rounded-md bg-accent"></div>
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-4 border-t border-border pt-6">
              <div class="h-4 w-28 rounded-sm bg-accent"></div>
              <div class="flex items-center gap-4">
                <div class="size-20 rounded-full bg-accent"></div>
                <div class="flex flex-1 flex-col gap-2">
                  <div class="h-11 w-32 rounded-md bg-accent"></div>
                  <div class="h-3 w-48 rounded-sm bg-accent"></div>
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-4 border-t border-border pt-6">
              <div class="h-4 w-24 rounded-sm bg-accent"></div>
              <div class="h-11 w-full rounded-md bg-accent"></div>
            </div>
            <div class="flex flex-col gap-4 border-t border-border pt-6">
              <div class="h-4 w-32 rounded-sm bg-accent"></div>
              <div class="h-32 w-full rounded-md bg-accent"></div>
            </div>
          </div>
          <div class="card flex flex-col gap-4">
            <div class="h-4 w-24 rounded-sm bg-accent"></div>
            <div class="h-3 w-40 rounded-sm bg-accent"></div>
            <div class="h-24 w-full rounded-md bg-accent"></div>
          </div>
        </div>
      </div>
    } @else if (loadError()) {
      <div class="card flex flex-col gap-4">
        <p appAlertMessage>{{ loadError() }}</p>
        <div>
          <button type="button" appBigButton variant="outline" size="md" (click)="load()">
            Reintentar
          </button>
        </div>
      </div>
    } @else {
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <form class="min-w-0" (submit)="save($event)" novalidate>
          <div class="card flex flex-col gap-6">
            @if (missingLabels().length > 0) {
              <div class="flex flex-col gap-3 rounded-md border border-border bg-muted p-4">
                <h2 class="text-base font-semibold text-foreground">Completa tu perfil</h2>
                <p class="text-sm text-muted-foreground text-pretty">
                  Una ficha completa ayuda a que los pacientes confíen y reserven contigo. Te falta:
                </p>
                <ul class="flex flex-wrap gap-x-4 gap-y-1.5">
                  @for (item of missingLabels(); track item) {
                    <li class="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <span class="size-1 rounded-full bg-muted-foreground" aria-hidden="true"></span>
                      {{ item }}
                    </li>
                  }
                </ul>
              </div>
            }

            <section class="flex flex-col gap-4" aria-labelledby="perfil-identidad">
              <div>
                <h2 id="perfil-identidad" class="text-base font-semibold text-foreground">Identidad</h2>
                <p class="mt-0.5 text-sm text-muted-foreground">
                  Tu nombre como aparece en la agenda pública.
                </p>
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <app-text-field
                  fieldId="perfil-primer-nombre"
                  label="Primer nombre"
                  autocomplete="given-name"
                  inputClass="h-11 sm:h-10"
                  [required]="true"
                  [value]="form().firstName"
                  [error]="errors().firstName"
                  (valueChange)="patch('firstName', $event)"
                />
                <app-text-field
                  fieldId="perfil-segundo-nombre"
                  label="Segundo nombre"
                  autocomplete="additional-name"
                  inputClass="h-11 sm:h-10"
                  [value]="form().secondName"
                  (valueChange)="patch('secondName', $event)"
                />
                <app-text-field
                  fieldId="perfil-primer-apellido"
                  label="Primer apellido"
                  autocomplete="family-name"
                  inputClass="h-11 sm:h-10"
                  [required]="true"
                  [value]="form().firstSurname"
                  [error]="errors().firstSurname"
                  (valueChange)="patch('firstSurname', $event)"
                />
                <app-text-field
                  fieldId="perfil-segundo-apellido"
                  label="Segundo apellido"
                  autocomplete="family-name"
                  inputClass="h-11 sm:h-10"
                  [value]="form().secondSurname"
                  (valueChange)="patch('secondSurname', $event)"
                />
              </div>
            </section>

            <section
              class="flex flex-col gap-4 border-t border-border pt-6"
              aria-labelledby="perfil-foto-titulo"
            >
              <div>
                <h2 id="perfil-foto-titulo" class="text-base font-semibold text-foreground">
                  Foto de perfil
                </h2>
                <p class="mt-0.5 text-sm text-muted-foreground">
                  Una foto reciente ayuda a que te reconozcan en la agenda.
                </p>
              </div>
              <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
                @if (photoPreview() || photoUrl()) {
                  <img
                    [src]="photoPreview() ?? photoUrl()"
                    alt="Vista previa de tu foto de perfil"
                    class="size-20 shrink-0 rounded-full border border-border object-cover"
                  />
                } @else {
                  <span
                    class="flex size-20 shrink-0 items-center justify-center rounded-full bg-secondary text-xl font-semibold text-secondary-foreground"
                    aria-hidden="true"
                  >
                    {{ initials() }}
                  </span>
                }

                <div class="flex min-w-0 flex-1 flex-col gap-3">
                  <div class="flex flex-wrap items-center gap-3">
                    <label
                      for="perfil-foto"
                      class="relative inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-border bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-card"
                    >
                      Elegir foto
                      <input
                        id="perfil-foto"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        class="sr-only"
                        [attr.aria-invalid]="!!photoError()"
                        [attr.aria-describedby]="photoError() ? 'perfil-foto-error' : null"
                        (change)="onPhotoSelected($event)"
                      />
                    </label>
                    @if (chosenPhoto()) {
                      <span class="min-w-0 truncate text-sm text-muted-foreground">
                        {{ chosenPhoto()?.name }}
                      </span>
                    }
                  </div>
                  <p class="text-xs text-muted-foreground">JPG, PNG o WebP. Máximo 5 MB.</p>
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
                  @if (photoError()) {
                    <p
                      id="perfil-foto-error"
                      role="alert"
                      tabindex="-1"
                      class="text-sm font-medium text-destructive"
                    >
                      {{ photoError() }}
                    </p>
                  }
                </div>
              </div>
            </section>

            <section
              class="flex flex-col gap-4 border-t border-border pt-6"
              aria-labelledby="perfil-formacion"
            >
              <div>
                <h2 id="perfil-formacion" class="text-base font-semibold text-foreground">
                  Formación
                </h2>
                <p class="mt-0.5 text-sm text-muted-foreground">
                  Títulos y especialidades que verán tus pacientes. Al menos uno es obligatorio.
                </p>
              </div>
              <fieldset class="flex flex-col gap-3">
                <legend class="sr-only">Títulos académicos</legend>
                @for (title of form().academicTitles; track $index) {
                  <div class="flex items-end gap-2">
                    <app-text-field
                      class="min-w-0 flex-1"
                      [fieldId]="'perfil-titulo-' + $index"
                      [label]="'Título académico ' + ($index + 1)"
                      inputClass="h-11 sm:h-10"
                      [required]="true"
                      [value]="title"
                      [error]="$index === 0 ? errors().academicTitles : undefined"
                      (valueChange)="setTitle($index, $event)"
                    />
                    <button
                      type="button"
                      appBigButton
                      variant="ghost"
                      size="md"
                      class="shrink-0"
                      [disabled]="form().academicTitles.length === 1"
                      [attr.aria-label]="'Quitar título académico ' + ($index + 1)"
                      (click)="removeTitle($index)"
                    >
                      <svg lucideX aria-hidden="true"></svg>
                    </button>
                  </div>
                }
              </fieldset>
              <div>
                <button type="button" appBigButton variant="outline" size="md" (click)="addTitle()">
                  <svg lucidePlus aria-hidden="true"></svg>
                  Agregar título
                </button>
              </div>
            </section>

            <section
              class="flex flex-col gap-4 border-t border-border pt-6"
              aria-labelledby="perfil-presentacion"
            >
              <div>
                <h2 id="perfil-presentacion" class="text-base font-semibold text-foreground">
                  Presentación
                </h2>
                <p class="mt-0.5 text-sm text-muted-foreground">
                  Cuéntales cómo trabajas; es lo primero que leen tus pacientes.
                </p>
              </div>
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
              @if (!form().description.trim()) {
                <p class="text-xs text-muted-foreground text-pretty">
                  Tu presentación está vacía. La agenda solo mostrará los datos que ya completaste.
                </p>
              }
            </section>

            @if (submitError()) {
              <p appAlertMessage>{{ submitError() }}</p>
            }
            @if (notice()) {
              <p role="status" class="flex items-center gap-2 text-sm font-medium text-success">
                <svg lucideCircleCheck class="size-4 shrink-0" aria-hidden="true"></svg>
                {{ notice() }}
              </p>
            }

            <div
              class="-mx-5 -mb-5 flex flex-col gap-3 border-t border-border bg-card px-5 pb-5 pt-4 sm:-mx-6 sm:-mb-6 sm:px-6 sm:pb-6 lg:mx-0 lg:mb-0 lg:px-0 lg:pb-0"
            >
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p class="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
                  @if (dirty()) {
                    Tienes cambios sin guardar.
                  } @else {
                    <svg lucideCircleCheck class="size-4 shrink-0 text-success" aria-hidden="true"></svg>
                    Todo guardado.
                  }
                </p>
                <button type="submit" appBigButton size="md" [disabled]="saving()">
                  {{ saving() ? 'Guardando…' : 'Guardar cambios' }}
                </button>
              </div>
            </div>
          </div>
        </form>

        <aside class="flex flex-col gap-4 self-start lg:sticky lg:top-6" aria-labelledby="perfil-vista-previa">
          <div>
            <h2 id="perfil-vista-previa" class="card-title">Vista previa</h2>
            <p class="card-subtitle">Así apareces en la agenda pública.</p>
          </div>

          <div class="flex min-h-14 items-center gap-3 rounded-md border border-input bg-card p-4">
            @if (photoPreview() || photoUrl()) {
              <img
                [src]="photoPreview() ?? photoUrl()"
                alt=""
                class="size-11 shrink-0 rounded-full object-cover"
              />
            } @else {
              <span
                class="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground"
                aria-hidden="true"
              >
                {{ initials() }}
              </span>
            }
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <span class="text-sm font-medium leading-tight">{{ previewName() || '—' }}</span>
              <span class="text-xs text-muted-foreground">{{ specialty() || '—' }}</span>
              @if (previewTitles().length > 0) {
                <span class="text-xs font-medium text-foreground/80">
                  {{ previewTitles().join(' · ') }}
                </span>
              }
              @if (previewDescription()) {
                <span class="text-xs text-pretty text-muted-foreground">{{ previewDescription() }}</span>
              }
            </div>
          </div>

          @if (!previewDescription()) {
            <p class="text-xs text-muted-foreground text-pretty">
              Sin presentación, la ficha pública solo muestra tus datos básicos.
            </p>
          }

          <p class="border-t border-border pt-3 text-xs text-muted-foreground text-pretty">
            La foto se publica al subirla. El resto de los cambios se publica al guardar.
          </p>
        </aside>
      </div>
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
  protected readonly specialty = signal<string>('');

  /** Normalised snapshot of the last persisted form, used only to detect unsaved changes. */
  private readonly savedSnapshot = signal(this.snapshot(EMPTY_FORM));

  protected readonly dirty = computed(() => this.snapshot(this.form()) !== this.savedSnapshot());

  protected readonly initials = computed(() =>
    [this.form().firstName, this.form().firstSurname]
      .map((part) => part.trim().charAt(0))
      .join('')
      .toUpperCase(),
  );

  protected readonly previewTitles = computed(() =>
    this.form()
      .academicTitles.map((title) => title.trim())
      .filter((title) => title.length > 0),
  );

  protected readonly previewName = computed(() => composeFullName(this.form()));

  protected readonly previewDescription = computed(() => this.form().description.trim());

  protected readonly identityLine = computed(() => {
    const name = this.previewName();
    const specialty = this.specialty();
    return [name, specialty].filter((part) => part.length > 0).join(' · ');
  });

  protected readonly completeness = computed(() => {
    const form = this.form();
    const hasName = form.firstName.trim().length > 0 && form.firstSurname.trim().length > 0;
    const checks = [
      hasName,
      this.previewTitles().length > 0,
      this.previewDescription().length > 0,
      !!(this.photoPreview() ?? this.photoUrl()),
    ];
    const done = checks.filter(Boolean).length;
    return { done, total: checks.length, percent: Math.round((done / checks.length) * 100) };
  });

  protected readonly missingLabels = computed(() => {
    const form = this.form();
    const missing: string[] = [];
    if (form.firstName.trim().length === 0 || form.firstSurname.trim().length === 0) {
      missing.push('Tu nombre completo');
    }
    if (this.previewTitles().length === 0) missing.push('Al menos un título académico');
    if (this.previewDescription().length === 0) missing.push('Tu presentación');
    if (!(this.photoPreview() ?? this.photoUrl())) missing.push('Tu foto de perfil');
    return missing;
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      this.applyProfile(await this.store.dentistProfile());
    } catch {
      this.loadError.set(LOAD_ERROR);
    } finally {
      this.loading.set(false);
    }
  }

  protected patch(
    field: 'firstName' | 'secondName' | 'firstSurname' | 'secondSurname' | 'description',
    value: string,
  ): void {
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
    const form: DentistProfileForm = {
      firstName: profile.firstName,
      secondName: profile.secondName ?? '',
      firstSurname: profile.firstSurname,
      secondSurname: profile.secondSurname ?? '',
      academicTitles: profile.academicTitles.length > 0 ? [...profile.academicTitles] : [''],
      description: profile.description,
    };
    this.form.set(form);
    this.specialty.set(profile.specialty);
    this.savedSnapshot.set(this.snapshot(form));
    this.photoUrl.set(profile.photoUrl);
    this.photoPreview.set(null);
    this.chosenPhoto.set(null);
  }

  private snapshot(form: DentistProfileForm): string {
    return JSON.stringify({
      firstName: form.firstName.trim(),
      secondName: form.secondName.trim(),
      firstSurname: form.firstSurname.trim(),
      secondSurname: form.secondSurname.trim(),
      academicTitles: form.academicTitles.map((title) => title.trim()).filter((title) => title.length > 0),
      description: form.description.trim(),
    });
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
