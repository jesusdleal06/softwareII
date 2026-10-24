import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { LucideDownload, LucideFileChartColumn } from '@lucide/angular';
import { formatDate, reportRange, ReportShortcut } from '../../../core/domain';
import { AppointmentStatus } from '../../../core/models';
import { DailyReportDto, ReportDto } from '../../../core/api/api.types';
import { AppStore } from '../../../core/services/app-store.service';
import { BigButton } from '../../../shared/ui/big-button';
import { cn } from '../../../shared/ui/class-names';
import { SelectField, SelectOption, TextField } from '../../../shared/ui/field';
import { ReportCard } from '../components/report-card';
import { ReportChart } from '../components/report-chart';

type Shortcut = ReportShortcut | 'personalizado';

const SHORTCUTS: readonly { value: ReportShortcut; label: string }[] = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mes' },
  { value: '30', label: 'Últimos 30 días' },
];

/** Attendance reports for the administrative assistant (prototype `ReportesView`, container). */
@Component({
  selector: 'app-reports-page',
  imports: [BigButton, TextField, SelectField, ReportCard, ReportChart, LucideDownload, LucideFileChartColumn],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  template: `
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-2xl font-bold tracking-tight">Reportes</h1>
        <p class="text-base text-muted-foreground">
          Periodo del {{ formatDate(from()) }} al {{ formatDate(to()) }}{{ dentistSuffix() }}
        </p>
      </div>
      <div class="flex flex-col items-start gap-2 lg:items-end">
        <button
          type="button"
          appBigButton
          variant="outline"
          size="lg"
          (click)="exportReport()"
          [disabled]="empty() || invalidRange() || exporting()"
        >
          <svg lucideDownload></svg> {{ exporting() ? 'Exportando…' : 'Exportar' }}
        </button>
        @if (exported()) {
          <p role="status" class="text-sm text-muted-foreground">Archivo CSV descargado.</p>
        }
      </div>
    </div>

    <section class="flex flex-col gap-4 rounded-2xl border bg-card p-4" aria-labelledby="filtros">
      <h2 id="filtros" class="sr-only">Filtros</h2>
      <div class="flex flex-wrap gap-2" role="group" aria-label="Periodos rápidos">
        @for (s of shortcuts; track s.value) {
          <button
            type="button"
            [attr.aria-pressed]="shortcut() === s.value"
            (click)="applyShortcut(s.value)"
            [class]="
              cn(
                'min-h-12 rounded-xl border px-4 text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring',
                shortcut() === s.value ? 'border-primary bg-accent text-accent-foreground' : 'bg-card hover:bg-muted'
              )
            "
          >
            {{ s.label }}
          </button>
        }
      </div>
      <div class="grid gap-4 sm:grid-cols-3">
        <app-text-field
          fieldId="desde"
          label="Desde"
          type="date"
          [value]="from()"
          inputClass="min-h-12 text-base"
          (valueChange)="setRange($event, to())"
        />
        <app-text-field
          fieldId="hasta"
          label="Hasta"
          type="date"
          [value]="to()"
          inputClass="min-h-12 text-base"
          [error]="invalidRange() ? 'La fecha final debe ser igual o posterior a la inicial.' : undefined"
          (valueChange)="setRange(from(), $event)"
        />
        <app-select-field
          fieldId="rep-dentista"
          label="Odontólogo (opcional)"
          placeholder="Todos"
          [options]="dentistOptions()"
          [value]="dentistId()"
          inputClass="min-h-12 text-base"
          (valueChange)="dentistId.set($event)"
        />
      </div>
    </section>

    @if (loading()) {
      <p role="status" class="rounded-2xl border bg-card px-5 py-10 text-center text-lg text-muted-foreground">
        Cargando el reporte…
      </p>
    } @else if (error()) {
      <div class="flex flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-6 py-10 text-center">
        <p class="text-lg font-semibold">No pudimos cargar el reporte.</p>
        <button type="button" appBigButton variant="outline" size="md" (click)="reload()">Reintentar</button>
      </div>
    } @else if (empty()) {
      <div class="flex flex-col items-center gap-4 rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
        <span class="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
          <svg lucideFileChartColumn class="size-8"></svg>
        </span>
        <p class="text-xl font-bold">No hay datos para el periodo seleccionado</p>
        <p class="max-w-md text-base text-muted-foreground text-pretty">
          Prueba con otro rango de fechas o quita el filtro de odontólogo.
        </p>
      </div>
    } @else {
      @let m = metrics();
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen">
        <div appReportCard heading="Pacientes atendidos" [value]="m.attended" tone="text-success"></div>
        <div appReportCard heading="Citas canceladas" [value]="m.cancelled" tone="text-destructive"></div>
        <div appReportCard heading="Inasistencias" [value]="m.noShow" tone="text-muted-foreground"></div>
        <div
          appReportCard
          heading="Índice de inasistencia"
          [value]="m.noShowRate + '%'"
          [tone]="m.noShowRate >= 20 ? 'text-destructive' : 'text-foreground'"
          [note]="m.noShow + ' de ' + (m.attended + m.noShow) + ' citas finalizadas'"
        ></div>
      </section>

      <section appReportChart [days]="breakdown()"></section>
    }
  `,
})
export class ReportsPage {
  private readonly store = inject(AppStore);

  protected readonly cn = cn;
  protected readonly formatDate = formatDate;
  protected readonly shortcuts = SHORTCUTS;
  protected readonly dentistOptions = computed<SelectOption[]>(() =>
    this.store.dentists().map((d) => ({ value: d.id, label: d.name })),
  );
  protected readonly report = signal<ReportDto | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly exporting = signal(false);

  protected readonly shortcut = signal<Shortcut>('semana');
  private readonly range = signal<[string, string]>(reportRange('semana', this.store.now()));
  protected readonly from = computed(() => this.range()[0]);
  protected readonly to = computed(() => this.range()[1]);
  protected readonly dentistId = signal('');
  protected readonly exported = signal(false);

  protected readonly metrics = computed(() => {
    const report = this.report();
    return {
      attended: report?.attended ?? 0,
      cancelled: report?.cancelled ?? 0,
      noShow: report?.noShow ?? 0,
      noShowRate: report?.noShowRate ?? 0,
    };
  });
  protected readonly breakdown = computed(() =>
    (this.report()?.daily ?? []).map((day) => ({
      date: day.date,
      total: day.total,
      counts: mapCounts(day),
    })),
  );
  protected readonly empty = computed(() => (this.report()?.total ?? 0) === 0);
  protected readonly invalidRange = computed(() => this.from() > this.to());
  protected readonly dentistSuffix = computed(() => {
    const id = this.dentistId();
    if (!id) return '';
    const name = this.store.dentists().find((d) => d.id === id)?.name;
    return name ? ` · ${name}` : '';
  });

  private requestSeq = 0;

  constructor() {
    void this.store.ensureCatalogs();
    effect(() => {
      const from = this.from();
      const to = this.to();
      const dentistId = this.dentistId();
      if (from > to) {
        // The date field already shows the error; the empty state follows, without a request.
        this.report.set(null);
        this.loading.set(false);
        this.error.set(false);
        return;
      }
      const seq = ++this.requestSeq;
      this.loading.set(true);
      this.error.set(false);
      this.exported.set(false);
      this.store
        .report(from, to, dentistId || undefined)
        .then((report) => {
          if (seq !== this.requestSeq) return;
          this.report.set(report);
          this.loading.set(false);
        })
        .catch(() => {
          if (seq !== this.requestSeq) return;
          this.error.set(true);
          this.loading.set(false);
        });
    });
  }

  protected reload(): void {
    const from = this.from();
    const to = this.to();
    if (from > to) return;
    void this.store
      .report(from, to, this.dentistId() || undefined)
      .then((report) => {
        this.report.set(report);
        this.error.set(false);
      })
      .catch(() => this.error.set(true));
  }

  protected async exportReport(): Promise<void> {
    if (this.empty() || this.invalidRange() || this.exporting()) return;
    this.exporting.set(true);
    try {
      const { blob, filename } = await this.store.exportReport(this.from(), this.to(), this.dentistId() || undefined);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      this.exported.set(true);
    } catch {
      this.error.set(true);
    } finally {
      this.exporting.set(false);
    }
  }

  protected applyShortcut(shortcut: ReportShortcut): void {
    this.shortcut.set(shortcut);
    this.range.set(reportRange(shortcut, this.store.now()));
  }

  protected setRange(from: string, to: string): void {
    this.shortcut.set('personalizado');
    this.range.set([from, to]);
  }
}

function mapCounts(day: DailyReportDto): Record<AppointmentStatus, number> {
  return {
    Pendiente: day.counts.pending,
    Confirmada: day.counts.confirmed,
    Reprogramada: day.counts.rescheduled,
    Cancelada: day.counts.cancelled,
    Atendida: day.counts.attended,
    'No asistió': day.counts.noShow,
  };
}
