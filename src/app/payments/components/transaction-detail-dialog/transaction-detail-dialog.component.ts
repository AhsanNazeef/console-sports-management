import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../common/components/button/button.component';
import { ModalComponent } from '../../../common/components/modal/modal.component';
import { StatusTagComponent } from '../../../common/components/status-tag/status-tag.component';
import { formatDateTime } from '../../../common/utils/datetime.util';
import { PaymentStatus, Transaction } from '../../models/payment.model';
import {
  isPaymentStatus,
  nextPaymentStatuses,
  paymentMethodLabel,
  paymentStatusLabel,
  paymentStatusTone,
} from '../../utils/payment.util';

interface DetailField {
  label: string;
  value: string;
}

// A transaction opened from the table: its details, and for ADMIN and OPERATOR a status change to the statuses
// allowed from the current one (the page asks for confirmation before sending it).
@Component({
  selector: 'app-transaction-detail-dialog',
  standalone: true,
  imports: [FormsModule, ButtonComponent, ModalComponent, StatusTagComponent],
  templateUrl: './transaction-detail-dialog.component.html',
  styleUrl: './transaction-detail-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionDetailDialogComponent {
  readonly transaction = input<Transaction | null>(null);
  readonly canChangeStatus = input(false);
  // A newer copy is on its way after a change; the change form waits for it.
  readonly refreshing = input(false);
  readonly error = input<string | null>(null);

  readonly statusChange = output<PaymentStatus>();
  readonly closed = output<void>();

  // Kept when a newer copy of the same transaction arrives and the choice is still allowed; cleared otherwise.
  readonly newStatus = linkedSignal<Transaction | null, PaymentStatus | ''>({
    source: this.transaction,
    computation: (current, previous) => {
      const kept = previous?.value;
      const sameTransaction = !!current && previous?.source?.id === current.id;
      return sameTransaction && kept && nextPaymentStatuses(current.status).includes(kept) ? kept : '';
    },
  });

  readonly heading = computed(() => this.transaction()?.reference ?? 'Transaction');
  readonly statusLabel = computed(() => paymentStatusLabel(this.transaction()?.status ?? ''));
  readonly statusTone = computed(() => paymentStatusTone(this.transaction()?.status ?? ''));
  readonly nextStatuses = computed(() =>
    nextPaymentStatuses(this.transaction()?.status ?? '').map((status) => ({
      status,
      label: paymentStatusLabel(status),
    }))
  );
  // Why there is nothing to change to.
  readonly finalNote = computed(() => {
    const status = this.transaction()?.status ?? '';
    return isPaymentStatus(status)
      ? `A ${paymentStatusLabel(status).toLowerCase()} payment can't be changed.`
      : "This status isn't one the console knows, so it can't be changed here.";
  });
  readonly fields = computed<DetailField[]>(() => {
    const transaction = this.transaction();
    if (!transaction) {
      return [];
    }
    return [
      { label: 'Amount', value: transaction.amountFormatted },
      { label: 'Currency', value: transaction.currency },
      { label: 'Method', value: paymentMethodLabel(transaction.method) },
      { label: 'Description', value: transaction.description || '—' },
      { label: 'Customer', value: transaction.customer || '—' },
      { label: 'Created', value: formatDateTime(transaction.createdAt) ?? '—' },
      { label: 'Updated', value: formatDateTime(transaction.updatedAt) ?? '—' },
    ];
  });

  requestChange(): void {
    const status = this.newStatus();
    if (status) {
      this.statusChange.emit(status);
    }
  }
}
