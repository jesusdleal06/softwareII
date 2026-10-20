import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Modal } from './modal';

@Component({
  imports: [Modal],
  template: `
    <app-modal
      [open]="open()"
      title="Cancelar cita"
      description="Esta acción no se puede deshacer."
      (closed)="onClosed()"
    >
      <p>Contenido de la cita</p>
    </app-modal>
  `,
})
class Host {
  readonly open = signal(true);
  closedCount = 0;

  onClosed(): void {
    this.closedCount += 1;
    this.open.set(false);
  }
}

@Component({
  imports: [Modal],
  template: `
    <app-modal [open]="true" title="Primero" description="Descripción uno">
      <p>Uno</p>
    </app-modal>
    <app-modal [open]="true" title="Segundo" description="Descripción dos">
      <p>Dos</p>
    </app-modal>
  `,
})
class TwoModals {}

describe('Modal', () => {
  it('closes when the backdrop (wrapper) is clicked', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    const backdrop = dialog.firstElementChild as HTMLElement;
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(host.closedCount).toBe(1);
    expect(host.open()).toBe(false);
  });

  it('does not close when the panel content is clicked', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const panel = fixture.nativeElement.querySelector('[role="document"]') as HTMLElement;
    panel.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(host.closedCount).toBe(0);
    expect(host.open()).toBe(true);
  });

  it('still closes on Esc (cancel event)', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialog.dispatchEvent(new Event('cancel', { bubbles: false, cancelable: true }));
    fixture.detectChanges();
    expect(host.closedCount).toBe(1);
    expect(host.open()).toBe(false);
  });

  it('locks body scroll while open', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('hidden');
    fixture.destroy();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('gives the close button a full-opacity 2px focus ring', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const close = fixture.nativeElement.querySelector('button[aria-label="Cerrar"]') as HTMLButtonElement;
    expect(close.className).toContain('focus-visible:ring-2');
    expect(close.className).toContain('focus-visible:ring-ring');
    expect(close.className).not.toContain('ring-4');
  });

  it('announces its content through the dialog labels, without inventing a live region', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLElement;
    const titleId = dialog.getAttribute('aria-labelledby') as string;
    expect(dialog.querySelector(`#${titleId}`)?.textContent?.trim()).toBe('Cancelar cita');
    const descId = dialog.getAttribute('aria-describedby') as string;
    expect(dialog.querySelector(`#${descId}`)?.textContent?.trim()).toBe('Esta acción no se puede deshacer.');
    expect(dialog.getAttribute('aria-live')).toBeNull();
  });

  it('gives every modal instance its own title and description ids', () => {
    const fixture = TestBed.createComponent(TwoModals);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const dialogs = Array.from(root.querySelectorAll('dialog')) as HTMLElement[];
    expect(dialogs).toHaveLength(2);
    const titleIds = dialogs.map((d) => d.getAttribute('aria-labelledby'));
    const descIds = dialogs.map((d) => d.getAttribute('aria-describedby'));
    expect(titleIds.every((id) => !!id)).toBe(true);
    expect(new Set(titleIds).size).toBe(2);
    expect(new Set(descIds).size).toBe(2);
    dialogs.forEach((dialog, index) => {
      expect(root.querySelector(`#${titleIds[index]}`)?.textContent?.trim()).toBe(index === 0 ? 'Primero' : 'Segundo');
      expect(root.querySelector(`#${descIds[index]}`)?.textContent?.trim()).toBe(
        index === 0 ? 'Descripción uno' : 'Descripción dos',
      );
    });
  });
});
