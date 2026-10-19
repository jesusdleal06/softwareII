import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PublicFooter, PublicHeader } from '../../../shared/ui/public-header';
import { LoginForm } from '../components/login-form';

@Component({
  selector: 'app-login-page',
  imports: [PublicHeader, PublicFooter, LoginForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  template: `
    <header appPublicHeader></header>
    <main class="flex flex-1 items-center">
      <div class="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <div class="mx-auto w-full max-w-md">
          <app-login-form />
        </div>
      </div>
    </main>
    <footer appPublicFooter></footer>
  `,
})
export class LoginPage {}
