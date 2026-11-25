/** Sign-up, sign-in, sign-out and who is signed in. */
import { Router, type Request, type Response } from 'express';
import { emailKey, type AccountSession, type AccountStore } from '../auth/accounts.js';
import { currentAccount, type SessionResolver } from '../auth/require-user.js';
import { clearSessionCookie, setSessionCookie, type Sessions } from '../auth/sessions.js';
import type { AuthMode } from '../config.js';
import type { LoginThrottle } from '../security/login-throttle.js';
import { credentialsSchema } from '../validation/request-schemas.js';

/** What the sign-in routes need. */
export interface AuthDependencies {
  readonly mode: AuthMode;
  readonly resolve: SessionResolver | null;
  /** The account store, session signer and failed-sign-in throttle; null when sign-in is off. */
  readonly signIn: {
    readonly accounts: AccountStore;
    readonly sessions: Sessions;
    readonly throttle: LoginThrottle;
  } | null;
}

/** One message for both a wrong email and a wrong password, so neither can be probed. */
const WRONG_CREDENTIALS = 'That email and password do not match an account.';

/** The same answer whether or not the password was right, so a locked account cannot be probed. */
const TOO_MANY_FAILURES = 'Too many wrong passwords for this account. Try again in 15 minutes.';

/** The account store and session signer, when sign-in is on. */
type SignIn = NonNullable<AuthDependencies['signIn']>;

/**
 * Email-and-password accounts: sign up, sign in, sign out, and who is signed
 * in. The session is an HttpOnly, Secure, SameSite=Strict cookie, so page
 * scripts never see it and other sites cannot send it.
 */
export function authRouter({ mode, resolve, signIn }: AuthDependencies): Router {
  const router = Router();
  router.get('/auth/session', sessionHandler(mode, resolve));
  if (signIn !== null) {
    router.post('/auth/register', registerHandler(signIn));
    router.post('/auth/login', loginHandler(signIn));
    router.post('/auth/logout', logoutHandler(signIn, resolve));
  }
  return router;
}

/** Who is signed in: always the one local household with sign-in off. */
const sessionHandler =
  (mode: AuthMode, resolve: SessionResolver | null) =>
  async (request: Request, response: Response): Promise<void> => {
    response.setHeader('Cache-Control', 'no-store');
    if (mode === 'none') {
      response.json({ signedIn: true, email: null });
      return;
    }
    const account = await currentAccount(request, resolve);
    response.json(
      account === null
        ? { signedIn: false, email: null }
        : { signedIn: true, email: account.email },
    );
  };

/** Starts a session for the account and answers with who is signed in. */
function startSession(
  { sessions }: SignIn,
  response: Response,
  { account, status }: { readonly account: AccountSession; readonly status: number },
): void {
  response.setHeader('Set-Cookie', setSessionCookie(sessions.issue(account.uid, account.version)));
  response.status(status).json({ email: account.email });
}

/** Creates an account and signs it in; 409 when the email is taken. */
const registerHandler =
  (signIn: SignIn) =>
  async (request: Request, response: Response): Promise<void> => {
    const parsed = credentialsSchema.safeParse(request.body);
    if (!parsed.success) {
      response
        .status(400)
        .json({ error: 'Enter a valid email and a password of 10 to 128 characters.' });
      return;
    }
    const account = await signIn.accounts.register(parsed.data.email, parsed.data.password);
    if (account === 'taken') {
      response.status(409).json({ error: 'That email already has an account. Sign in instead.' });
      return;
    }
    startSession(signIn, response, { account, status: 201 });
  };

/**
 * Signs in with a correct email and password; one 401 for anything else.
 * After five wrong passwords the account answers 429 for fifteen minutes,
 * before any password is checked, whichever address the guesses come from.
 */
const loginHandler =
  (signIn: SignIn) =>
  async (request: Request, response: Response): Promise<void> => {
    const parsed = credentialsSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(401).json({ error: WRONG_CREDENTIALS });
      return;
    }
    const { email, password } = parsed.data;
    const key = emailKey(email);
    if (signIn.throttle.blocked(key)) {
      response.status(429).json({ error: TOO_MANY_FAILURES });
      return;
    }
    const account = await signIn.accounts.authenticate(email, password);
    if (account === null) {
      signIn.throttle.fail(key);
      response.status(401).json({ error: WRONG_CREDENTIALS });
      return;
    }
    signIn.throttle.clear(key);
    startSession(signIn, response, { account, status: 200 });
  };

/**
 * Signs out: ends the account's sessions on the server, not just this
 * browser's cookie, so a copied token stops working too.
 */
const logoutHandler =
  (signIn: SignIn, resolve: SessionResolver | null) =>
  async (request: Request, response: Response): Promise<void> => {
    const account = await currentAccount(request, resolve);
    if (account !== null) await signIn.accounts.endSessions(account.uid);
    response.setHeader('Set-Cookie', clearSessionCookie());
    response.status(204).end();
  };
