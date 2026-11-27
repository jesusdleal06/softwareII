import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { LucideDownload, LucideFileChartColumn } from '@lucide/angular';
import { formatDate, formatDateTime, reportRange, ReportShortcut } from '../../../core/domain';
import { AppointmentStatus } from '../../../core/models';
import { DailyReportDto, ReportDto, ReportHistoryDto } from '../../../core/api/api.types';
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
  styles: `
    @media (width < 40rem) {
      .report-metrics {
        /* At most two columns; each needs 9rem, so larger text can fall back to one. */
        grid-template-columns: repeat(auto-fit, minmax(min(100%, max(9rem, 40%)), 1fr));
      }

      .report-metrics > div {
        overflow-wrap: anywhere;
        padding-inline: 0.75rem;
      }
    }
  `,
  template: `
    <div class="page-header flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="page-title">Reportes</h1>
        <p class="page-subtitle tabular-nums">
          Periodo del {{ formatDate(from()) }} al {{ formatDate(to()) }}{{ dentistSuffix() }}
        </p>
      </div>
      <div class="flex flex-col items-start gap-2 lg:items-end">
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            appBigButton
            variant="secondary"
            size="md"
            (click)="exportReport()"
            [disabled]="empty() || invalidRange() || exporting() !== null"
          >
            <svg lucideDownload></svg> {{ exporting() === 'csv' ? 'Exportando…' : 'Exportar' }}
          </button>
          <button
            type="button"
            appBigButton
            variant="secondary"
            size="md"
            (click)="exportReportPdf()"
            [disabled]="empty() || invalidRange() || exporting() !== null"
          >
            <svg lucideDownload></svg> {{ exporting() === 'pdf' ? 'Generando…' : 'Descargar PDF' }}
          </button>
        </div>
        @if (exported()) {
          <p role="status" class="text-xs text-muted-foreground">
            {{ exported() === 'pdf' ? 'Archivo PDF descargado.' : 'Archivo CSV descargado.' }}
          </p>
        }
      </div>
    </div>

    <section class="card flex flex-col gap-4" aria-labelledby="filtros">
      <h2 id="filtros" class="sr-only">Filtros</h2>
      <div class="flex flex-wrap gap-2" role="group" aria-label="Periodos rápidos">
        @for (s of shortcuts; track s.value) {
          <button
            type="button"
            [attr.aria-pressed]="shortcut() === s.value"
            (click)="applyShortcut(s.value)"
            [class]="
              cn(
                'btn-quiet px-3',
                shortcut() === s.value && 'border-primary bg-accent text-accent-foreground hover:bg-accent'
              )
            "
          >
            {{ s.label }}
          </button>
        }
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <app-text-field
          fieldId="desde"
          label="Desde"
          type="date"
          [value]="from()"
          (valueChange)="setRange($event, to())"
        />
        <app-text-field
          fieldId="hasta"
          label="Hasta"
          type="date"
          [value]="to()"
          [error]="invalidRange() ? 'La fecha final debe ser igual o posterior a la inicial.' : undefined"
          (valueChange)="setRange(from(), $event)"
        />
        <app-select-field
          fieldId="rep-dentista"
          label="Odontólogo (opcional)"
          placeholder="Todos"
          [options]="dentistOptions()"
          [value]="dentistId()"
          (valueChange)="dentistId.set($event)"
        />
      </div>
    </section>

    @if (loading()) {
      <p role="status" class="card text-center text-sm text-muted-foreground">
        Cargando el reporte…
      </p>
    } @else if (error()) {
      <div class="flex flex-col items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-5 py-8 text-center">
        <p class="text-sm font-semibold">No pudimos cargar el reporte.</p>
        <button type="button" appBigButton variant="secondary" size="md" (click)="reload()">Reintentar</button>
      </div>
    } @else if (empty()) {
      <div class="card flex flex-col items-center gap-3 text-center">
        <span class="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
          <svg lucideFileChartColumn class="size-5"></svg>
        </span>
        <p class="text-sm font-semibold">No hay datos para el periodo seleccionado</p>
        <p class="max-w-md text-xs text-muted-foreground text-pretty">
          Prueba con otro rango de fechas o quita el filtro de odontólogo.
        </p>
      </div>
    } @else {
      @let m = metrics();
      <section class="report-metrics grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen">
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

    <section class="flex flex-col gap-3 rounded-xl border bg-card p-4" aria-labelledby="reportes-generados">
      <h2 id="reportes-generados" class="text-xl font-bold">Reportes generados</h2>

      @if (historyLoading()) {
        <p role="status" class="text-base text-muted-foreground">Cargando los reportes generados…</p>
      } @else if (historyError()) {
        <div class="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-6 py-8 text-center">
          <p class="text-base font-semibold">No pudimos cargar los reportes generados.</p>
          <button type="button" appBigButton variant="outline" size="md" (click)="loadHistory()">Reintentar</button>
        </div>
      } @else if (history().length === 0) {
        <p class="text-base text-muted-foreground">Aún no hay reportes generados.</p>
      } @else {
        @if (downloadError()) {
          <p role="alert" class="text-sm text-destructive">No pudimos descargar el reporte. Inténtalo de nuevo.</p>
        }
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left text-sm">
            <caption class="sr-only">Reportes generados</caption>
            <thead>
              <tr class="border-b text-muted-foreground">
                <th scope="col" class="px-2 py-2 font-semibold">Periodo</th>
                <th scope="col" class="px-2 py-2 font-semibold">Odontólogo</th>
                <th scope="col" class="px-2 py-2 font-semibold">Generado</th>
                <th scope="col" class="px-2 py-2 font-semibold">Autor</th>
                <th scope="col" class="px-2 py-2"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (entry of history(); track entry.id) {
                <tr class="border-b last:border-0">
                  <td class="px-2 py-3">{{ period(entry) }}</td>
                  <td class="px-2 py-3">{{ entry.dentistName ?? 'Todos' }}</td>
                  <td class="px-2 py-3">{{ formatDateTime(entry.generatedAt) }}</td>
                  <td class="px-2 py-3">{{ entry.generatedBy }}</td>
                  <td class="px-2 py-3 text-right">
                    <button
                      type="button"
                      appBigButton
                      variant="outline"
                      size="md"
                      [attr.aria-label]="'Descargar reporte del ' + period(entry)"
                      [disabled]="downloadingId() === entry.id"
                      (click)="downloadHistory(entry)"
                    >
                      <svg lucideDownload></svg> Descargar
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class ReportsPage {
  private readonly store = inject(AppStore);

  protected readonly cn = cn;
  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;
  protected readonly shortcuts = SHORTCUTS;
  protected readonly dentistOptions = computed<SelectOption[]>(() =>
    this.store.dentists().map((d) => ({ value: d.id, label: d.name })),
  );
  protected readonly report = signal<ReportDto | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly exporting = signal<'csv' | 'pdf' | null>(null);

  protected readonly shortcut = signal<Shortcut>('semana');
  private readonly range = signal<[string, string]>(reportRange('semana', this.store.now()));
  protected readonly from = computed(() => this.range()[0]);
  protected readonly to = computed(() => this.range()[1]);
  protected readonly dentistId = signal('');
  protected readonly exported = signal<'csv' | 'pdf' | null>(null);

  protected readonly history = signal<ReportHistoryDto[]>([]);
  protected readonly historyLoading = signal(false);
  protected readonly historyError = signal(false);
  protected readonly downloadError = signal(false);
  protected readonly downloadingId = signal<number | null>(null);

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
  private historySeq = 0;

  constructor() {
    void this.store.ensureCatalogs();
    this.loadHistory();
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
      this.exported.set(null);
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
    if (this.empty() || this.invalidRange() || this.exporting() !== null) return;
    this.exporting.set('csv');
    try {
      const { blob, filename } = await this.store.exportReport(this.from(), this.to(), this.dentistId() || undefined);
      this.saveBlob(blob, filename);
      this.exported.set('csv');
    } catch {
      this.error.set(true);
    } finally {
      this.exporting.set(null);
    }
  }

  protected async exportReportPdf(): Promise<void> {
    if (this.empty() || this.invalidRange() || this.exporting() !== null) return;
    this.exporting.set('pdf');
    try {
      const { blob, filename } = await this.store.exportReportPdf(this.from(), this.to(), this.dentistId() || undefined);
      this.saveBlob(blob, filename);
      this.exported.set('pdf');
      // The backend stores every generated PDF, so the list changes after a successful export.
      this.loadHistory();
    } catch {
      this.error.set(true);
    } finally {
      this.exporting.set(null);
    }
  }

  protected loadHistory(): void {
    const seq = ++this.historySeq;
    this.historyLoading.set(true);
    this.historyError.set(false);
    this.downloadError.set(false);
    this.store
      .reportHistory()
      .then((entries) => {
        if (seq !== this.historySeq) return;
        const newestFirst = [...entries].sort(
          (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
        );
        this.history.set(newestFirst);
        this.historyLoading.set(false);
      })
      .catch(() => {
        if (seq !== this.historySeq) return;
        this.historyError.set(true);
        this.historyLoading.set(false);
      });
  }

  protected async downloadHistory(entry: ReportHistoryDto): Promise<void> {
    if (this.downloadingId() !== null) return;
    this.downloadingId.set(entry.id);
    this.downloadError.set(false);
    try {
      const { blob, filename } = await this.store.downloadReportPdf(entry.id, entry.from, entry.to);
      this.saveBlob(blob, filename);
    } catch {
      this.downloadError.set(true);
    } finally {
      this.downloadingId.set(null);
    }
  }

  protected period(entry: ReportHistoryDto): string {
    return `${formatDate(entry.from)} al ${formatDate(entry.to)}`;
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
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
