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
    <!-- The body paints the canvas; the shell re-asserts it so the card groups sit on it. -->
    <main class="canvas flex-1 pb-12 sm:pb-16">
      <!-- Same padding as the page-header utility; the flow keeps its own narrower measure. -->
      <div class="page-header mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <app-booking-flow />
      </div>
    </main>
    <footer appPublicFooter></footer>
  `,
})
export class BookingPage {}
