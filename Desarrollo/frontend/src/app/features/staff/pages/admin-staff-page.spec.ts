import { TestBed } from '@angular/core/testing';
import { StaffAdminApi, StaffMember } from '../data/staff-admin-api';
import { AdminStaffPage } from './admin-staff-page';

class FakeStaffAdminApi {
  async list(): Promise<StaffMember[]> {
    return [];
  }

  async create(): Promise<StaffMember> {
    throw new Error('create is not expected in this test');
  }

  async update(): Promise<StaffMember> {
    throw new Error('update is not expected in this test');
  }

  async setActive(): Promise<StaffMember> {
    throw new Error('setActive is not expected in this test');
  }
}

describe('AdminStaffPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: StaffAdminApi, useValue: new FakeStaffAdminApi() }],
    });
  });

  it('CP-RF13-08: asks for the specialty only when the new member is an odontólogo', async () => {
    const fixture = TestBed.createComponent(AdminStaffPage);
    await fixture.componentInstance.load();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[data-testid="staff-specialty"]')).toBeNull();

    fixture.componentInstance.setRole('ODONTOLOGO');
    fixture.detectChanges();

    expect(element.querySelector('[data-testid="staff-specialty"]')).not.toBeNull();
  });
});
