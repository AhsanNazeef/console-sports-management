import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/services/auth.service';
import { LoginPage } from './login.component';

describe('LoginPage', () => {
  const authService = { login$: vi.fn(), consumeMessage: vi.fn<() => string | null>() };
  let navigateByUrl: ReturnType<typeof vi.spyOn>;

  // Lets pending async work (the login stream, change detection) finish.
  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));
  const text = (page: HTMLElement): string => page.textContent ?? '';

  async function setUp(returnUrl: string | null = null): Promise<HTMLElement> {
    authService.login$.mockReset();
    authService.consumeMessage.mockReturnValue(null);
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}) } },
        },
      ],
    }).compileComponents();
    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(LoginPage);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  async function fillAndSubmit(page: HTMLElement, email: string, password: string): Promise<void> {
    const type = (selector: string, value: string): void => {
      const input = page.querySelector(selector) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    type('#login-email', email);
    type('#login-password', password);
    (page.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    await settle();
  }

  it('shows the Figma form: logo, email, password and Login', async () => {
    const page = await setUp();
    expect(page.querySelector('img[alt="Buzzer Admin Console"]')).toBeTruthy();
    expect(page.querySelector('#login-email')?.getAttribute('placeholder')).toBe('Email Address*');
    expect(page.querySelector('#login-password')?.getAttribute('type')).toBe('password');
    expect(page.querySelector('button[type="submit"]')?.textContent).toContain('Login');
  });

  it('lets the user show the password they typed', async () => {
    const page = await setUp();
    (page.querySelector('button[aria-label="Show password"]') as HTMLButtonElement).click();
    await settle();
    expect(page.querySelector('#login-password')?.getAttribute('type')).toBe('text');
    expect(page.querySelector('button[aria-label="Hide password"]')).toBeTruthy();
  });

  it('validates the fields before calling the API', async () => {
    const page = await setUp();
    await fillAndSubmit(page, '', '');
    expect(text(page)).toContain('Enter your email address.');
    expect(text(page)).toContain('Enter your password.');

    await fillAndSubmit(page, 'not-an-email', 'x');
    expect(text(page)).toContain('Enter a valid email address.');
    expect(authService.login$).not.toHaveBeenCalled();
  });

  it('logs in and opens the dashboard', async () => {
    const page = await setUp();
    authService.login$.mockReturnValue(of({ id: 'u1', email: 'admin@buzzer.dev', role: 'ADMIN' }));
    await fillAndSubmit(page, ' admin@buzzer.dev ', 'secret');
    expect(authService.login$).toHaveBeenCalledWith('admin@buzzer.dev', 'secret');
    expect(navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('returns to the page the user came from, but only inside the app', async () => {
    let page = await setUp('/sports');
    authService.login$.mockReturnValue(of({ id: 'u1', email: 'a@b.dev', role: 'ADMIN' }));
    await fillAndSubmit(page, 'a@b.dev', 'secret');
    expect(navigateByUrl).toHaveBeenCalledWith('/sports');

    TestBed.resetTestingModule();
    page = await setUp('//evil.example.com');
    authService.login$.mockReturnValue(of({ id: 'u1', email: 'a@b.dev', role: 'ADMIN' }));
    await fillAndSubmit(page, 'a@b.dev', 'secret');
    expect(navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('shows an error for wrong credentials and lets the user try again', async () => {
    const page = await setUp();
    authService.login$.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    await fillAndSubmit(page, 'admin@buzzer.dev', 'wrong');
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Incorrect email or password.');
    expect((page.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(false);
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('explains when the server cannot be reached', async () => {
    const page = await setUp();
    authService.login$.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    await fillAndSubmit(page, 'admin@buzzer.dev', 'secret');
    expect(page.querySelector('[role="alert"]')?.textContent).toContain("Couldn't reach the server");
  });

  it('disables the button while logging in', async () => {
    const page = await setUp();
    const pending = new Subject<never>();
    authService.login$.mockReturnValue(pending);
    await fillAndSubmit(page, 'admin@buzzer.dev', 'secret');
    const button = page.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Logging in…');
  });

  it('shows why the last session ended', async () => {
    authService.consumeMessage.mockReturnValue('Your session has expired. Please log in again.');
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    }).compileComponents();
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Your session has expired.');
  });
});
