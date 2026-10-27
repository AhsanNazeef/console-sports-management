import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiListResponse, ApiResponse } from '../../common/models/api.model';
import { PaymentStatus, PaymentSummary, Transaction, TransactionQuery } from '../models/payment.model';
import { searchTermForBackend } from '../utils/payment.util';

@Injectable({ providedIn: 'root' })
export class PaymentsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/payments`;

  // Counts and formatted totals per status, plus gross revenue, overall and per currency (byCurrency).
  getSummary$(): Observable<PaymentSummary> {
    return this.http.get<ApiResponse<PaymentSummary>>(`${this.baseUrl}/summary`).pipe(map((response) => response.data));
  }

  // The backend matches ?search= against the reference, the customer's email, the description and the method's code;
  // a method typed as the table shows it is sent as its code.
  getTransactions$(query: TransactionQuery): Observable<ApiListResponse<Transaction>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('limit', query.limit)
      .set('sortBy', query.sortBy)
      .set('sortOrder', query.sortOrder);
    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.currency) {
      params = params.set('currency', query.currency);
    }
    if (query.search) {
      params = params.set('search', searchTermForBackend(query.search));
    }
    return this.http.get<ApiListResponse<Transaction>>(`${this.baseUrl}/transactions`, { params });
  }

  getTransaction$(id: string): Observable<Transaction> {
    return this.http
      .get<ApiResponse<Transaction>>(`${this.baseUrl}/transactions/${id}`)
      .pipe(map((response) => response.data));
  }

  // ADMIN and OPERATOR only. The API documents no response body for it, so the page reads the transaction again
  // from its detail endpoint afterwards.
  changeStatus$(id: string, status: PaymentStatus): Observable<void> {
    return this.http.patch(`${this.baseUrl}/transactions/${id}/status`, { status }).pipe(map(() => undefined));
  }
}
