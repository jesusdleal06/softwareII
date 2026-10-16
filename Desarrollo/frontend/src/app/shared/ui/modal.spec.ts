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
});
