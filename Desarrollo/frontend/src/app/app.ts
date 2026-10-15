import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
  // Pages are flex columns that fill the body (`min-h-dvh flex flex-col` in index.html).
  host: { class: 'flex flex-1 flex-col' },
})
export class App {}
