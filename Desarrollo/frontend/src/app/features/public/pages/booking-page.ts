import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PublicFooter, PublicHeader } from '../../../shared/ui/public-header';
import { BookingFlow } from '../components/booking-flow';

@Component({
  selector: 'app-booking-page',
  imports: [PublicHeader, PublicFooter, BookingFlow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  template: `
    <header appPublicHeader></header>
    <main class="flex-1">
      <div class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <app-booking-flow />
      </div>
    </main>
    <footer appPublicFooter></footer>
  `,
})
export class BookingPage {}
