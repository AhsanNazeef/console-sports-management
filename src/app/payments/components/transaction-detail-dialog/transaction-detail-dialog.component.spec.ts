import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentStatus } from '../../models/payment.model';
import { transaction } from '../../testing/payment.fixtures';
import { TransactionDetailDialogComponent } from './transaction-detail-dialog.component';

describe('TransactionDetailDialogComponent', () => {
  let fixture: ComponentFixture<TransactionDetailDialogComponent>;
  let element: HTMLElement;
  let requested: PaymentStatus[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TransactionDetailDialogComponent] }).compileComponents();
    fixture = TestBed.createComponent(TransactionDetailDialogComponent);
    requested = [];
    fixture.componentInstance.statusChange.subscribe((status) => requested.push(status));
    element = fixture.nativeElement as HTMLElement;
  });

  async function show(canChangeStatus: boolean, status = 'PENDING', changes = {}): Promise<void> {
    fixture.componentRef.setInput('transaction', transaction('1', status as PaymentStatus, changes));
    fixture.componentRef.setInput('canChangeStatus', canChangeStatus);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const newStatus = (): HTMLSelectElement | null => element.querySelector('#transaction-new-status');
  const options = (): string[] => Array.from(newStatus()!.options).map((option) => option.textContent?.trim() ?? '');
  const changeButton = (): HTMLButtonElement =>
    Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Change Status'
    ) as HTMLButtonElement;

  // "Label value" for each field.
  const fieldText = (): string[] =>
    Array.from(element.querySelectorAll('.transaction-detail__field')).map(
      (field) => `${field.querySelector('dt')?.textContent?.trim()} ${field.querySelector('dd')?.textContent?.trim()}`
    );

  it('is closed until a transaction is given', () => {
    fixture.detectChanges();
    expect(element.querySelector('.transaction-detail')).toBeNull();
  });

  it('shows the transaction’s details under its reference', async () => {
    await show(false);
    expect(element.querySelector('.modal__title')?.textContent).toBe('TXN-1');
    expect(element.querySelector('app-status-tag')?.textContent?.trim()).toBe('Pending');
    expect(fieldText().slice(0, 5)).toEqual([
      'Amount $99.42',
      'Currency USD',
      'Method Apple Pay',
      'Description Match ticket',
      'Customer fan1017@buzzer.dev',
    ]);
    expect(element.querySelector('#transaction-new-status')).toBeNull();
  });

  it('offers the moves allowed from the current status and asks the page to make one', async () => {
    await show(true);
    expect(options()).toEqual(['Choose a status', 'Completed', 'Failed']);
    expect(changeButton().disabled).toBe(true);

    newStatus()!.value = 'COMPLETED';
    newStatus()!.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(changeButton().disabled).toBe(false);
    changeButton().click();
    expect(requested).toEqual(['COMPLETED']);
  });

  it('offers only Refunded for a completed payment', async () => {
    await show(true, 'COMPLETED');
    expect(options()).toEqual(['Choose a status', 'Refunded']);
  });

  it('says why a failed or refunded payment can’t be changed', async () => {
    await show(true, 'FAILED');
    expect(newStatus()).toBeNull();
    expect(element.querySelector('.transaction-detail__note')?.textContent?.trim()).toBe(
      "A failed payment can't be changed."
    );

    await show(true, 'REFUNDED');
    expect(element.querySelector('.transaction-detail__note')?.textContent?.trim()).toBe(
      "A refunded payment can't be changed."
    );
  });

  it('shows a status it doesn’t know as it is, and offers no change', async () => {
    await show(true, 'CHARGEBACK');
    expect(element.querySelector('app-status-tag')?.textContent?.trim()).toBe('CHARGEBACK');
    expect(newStatus()).toBeNull();
    expect(element.querySelector('.transaction-detail__note')?.textContent).toContain(
      "This status isn't one the console knows"
    );
  });

  it('keeps the chosen status when a newer copy of the same transaction arrives', async () => {
    await show(true);
    newStatus()!.value = 'FAILED';
    newStatus()!.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    await show(true, 'PENDING', { description: 'Season ticket' });
    expect(fixture.componentInstance.newStatus()).toBe('FAILED');

    fixture.componentRef.setInput('transaction', transaction('2', 'PENDING'));
    fixture.detectChanges();
    expect(fixture.componentInstance.newStatus()).toBe('');
  });

  it('drops the chosen status when the newer copy no longer allows it', async () => {
    await show(true);
    newStatus()!.value = 'FAILED';
    newStatus()!.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    await show(true, 'COMPLETED');
    expect(fixture.componentInstance.newStatus()).toBe('');
    expect(options()).toEqual(['Choose a status', 'Refunded']);
  });

  it('waits for the newer copy after a change', async () => {
    await show(true);
    fixture.componentRef.setInput('refreshing', true);
    fixture.detectChanges();
    expect(newStatus()).toBeNull();
    expect(element.querySelector('.transaction-detail__note')?.textContent?.trim()).toBe('Updating…');
  });
});
