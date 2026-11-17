import { HttpContextToken } from '@angular/common/http';

// Marks requests whose error the page or popup shows itself, so the console-wide notice doesn't repeat it.
export const SKIP_HTTP_NOTICE = new HttpContextToken<boolean>(() => false);

// The console-wide notice, for a refused (403) or rate-limited (429) request that has no message of its own.
export const FORBIDDEN_MESSAGE =
  "Your account isn't allowed to see part of this page. The console shows only what your role can use; ask an admin if you need more access.";
export const RATE_LIMITED_MESSAGE =
  'Too many requests: the server allows 300 a minute. Wait up to a minute, then try again.';

// The texts a page or popup shows for its own refused request.
export const FORBIDDEN_CHANGE_MESSAGE = "Your role isn't allowed to make this change.";
export const FORBIDDEN_LOAD_MESSAGE = "Your account isn't allowed to see this.";
