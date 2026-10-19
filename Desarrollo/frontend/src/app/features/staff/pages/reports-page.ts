import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LucideDownload, LucideFileChartColumn } from '@lucide/angular';
import { DENTISTS } from '../../../core/data/mock-data';
import {
  computeReportMetrics,
  dailyBreakdown,
  filterForReport,
  formatDate,
  reportDays,
  reportRange,
  ReportShortcut,
} from '../../../core/domain';
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
        <button type="button" appBigButton variant="outline" size="lg" (click)="exported.set(true)" [disabled]="empty()">
          <svg lucideDownload></svg> Exportar
        </button>
        @if (exported()) {
          <p role="status" class="text-sm text-muted-foreground">
            Exportación simulada: en el producto final se descargará un archivo Excel.
          </p>
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
          [options]="dentistOptions"
          [value]="dentistId()"
          inputClass="min-h-12 text-base"
          (valueChange)="dentistId.set($event)"
        />
      </div>
    </section>

    @if (empty()) {
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
  protected readonly dentistOptions: SelectOption[] = DENTISTS.map((d) => ({ value: d.id, label: d.name }));

  protected readonly shortcut = signal<Shortcut>('semana');
  private readonly range = signal<[string, string]>(reportRange('semana', this.store.now()));
  protected readonly from = computed(() => this.range()[0]);
  protected readonly to = computed(() => this.range()[1]);
  protected readonly dentistId = signal('');
  protected readonly exported = signal(false);

  protected readonly filtered = computed(() =>
    filterForReport(this.store.appointments(), { from: this.from(), to: this.to(), dentistId: this.dentistId() }),
  );
  protected readonly metrics = computed(() => computeReportMetrics(this.filtered()));
  protected readonly breakdown = computed(() => dailyBreakdown(this.filtered(), reportDays(this.from(), this.to())));
  protected readonly empty = computed(() => this.filtered().length === 0);
  protected readonly invalidRange = computed(() => this.from() > this.to());
  protected readonly dentistSuffix = computed(() => {
    const id = this.dentistId();
    return id ? ` · ${DENTISTS.find((d) => d.id === id)?.name}` : '';
  });

  protected applyShortcut(shortcut: ReportShortcut): void {
    this.shortcut.set(shortcut);
    this.range.set(reportRange(shortcut, this.store.now()));
  }

  protected setRange(from: string, to: string): void {
    this.shortcut.set('personalizado');
    this.range.set([from, to]);
  }
}
