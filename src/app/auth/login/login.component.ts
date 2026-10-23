import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, exhaustMap, finalize, of, Subject } from 'rxjs';
import { ButtonComponent } from '../../common/components/button/button.component';
import { TextInputComponent } from '../../common/components/text-input/text-input.component';
import { ApiErrorBody } from '../../common/models/api.model';
import { AuthService } from '../../core/auth/services/auth.service';
import { HOME_PATH, LOGIN_PATH } from '../constants/auth.constants';

const EMAIL_ERRORS: Record<string, string> = {
  required: 'Enter your email address.',
  email: 'Enter a valid email address.',
};
const PASSWORD_ERRORS: Record<string, string> = {
  required: 'Enter your password.',
};

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, ButtonComponent, TextInputComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly submitRequests$ = new Subject<void>();

  readonly emailErrors = EMAIL_ERRORS;
  readonly passwordErrors = PASSWORD_ERRORS;

  email = '';
  password = '';

  readonly isSubmitting = signal(false);
  readonly hasSubmitted = signal(false);
  readonly errorMessage = signal<string | null>(this.authService.consumeMessage());

  constructor() {
    this.submitRequests$
      .pipe(
        exhaustMap(() => {
          this.errorMessage.set(null);
          this.isSubmitting.set(true);
          return this.authService.login$(this.email.trim(), this.password).pipe(
            exhaustMap(() => this.router.navigateByUrl(this.returnUrl())),
            catchError((error: unknown) => {
              this.errorMessage.set(describeLoginError(error));
              return of(false);
            }),
            finalize(() => this.isSubmitting.set(false))
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe();
  }

  onSubmit(form: NgForm): void {
    if (this.isSubmitting()) {
      return;
    }
    this.hasSubmitted.set(true);
    if (form.invalid) {
      return;
    }
    this.submitRequests$.next();
  }

  // The first validation message for a field: after a submit attempt, or once the user has typed in it and left.
  // A field that was only clicked through stays quiet until submit.
  fieldError(control: NgModel, messages: Record<string, string>): string | null {
    const typedAndLeft = control.dirty && control.touched;
    if (!control.errors || !(typedAndLeft || this.hasSubmitted())) {
      return null;
    }
    return messages[Object.keys(control.errors)[0]] ?? null;
  }

  // Only same-app paths are allowed, so a crafted link can't send users elsewhere after login.
  private returnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith(LOGIN_PATH) ? url : HOME_PATH;
  }
}

function describeLoginError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Something went wrong. Please try again.';
  }
  if (error.status === 401) {
    return 'Incorrect email or password.';
  }
  if (error.status === 0) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  if (error.status === 400) {
    return (error.error as ApiErrorBody | null)?.error?.message ?? 'Check your email and password.';
  }
  return 'Something went wrong. Please try again.';
}
