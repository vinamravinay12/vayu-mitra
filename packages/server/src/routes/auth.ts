import { Router, type Response } from 'express';
import type { AccountSession, AccountStore } from '../auth/accounts.js';
import { currentAccount, type SessionResolver } from '../auth/require-user.js';
import { clearSessionCookie, setSessionCookie, type Sessions } from '../auth/sessions.js';
import type { AuthMode } from '../config.js';
import { credentialsSchema } from '../validation/request-schemas.js';

export interface AuthDependencies {
  readonly mode: AuthMode;
  readonly resolve: SessionResolver | null;
  /** The account store and session signer; null when sign-in is off. */
  readonly signIn: { readonly accounts: AccountStore; readonly sessions: Sessions } | null;
}

/** One message for both a wrong email and a wrong password, so neither can be probed. */
const WRONG_CREDENTIALS = 'That email and password do not match an account.';

/**
 * Email-and-password accounts: sign up, sign in, sign out, and who is signed
 * in. The session is an HttpOnly, Secure, SameSite=Strict cookie, so page
 * scripts never see it and other sites cannot send it.
 */
export function authRouter({ mode, resolve, signIn }: AuthDependencies): Router {
  const router = Router();
  router.get('/auth/session', async (request, response) => {
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
  });
  if (signIn === null) {
    return router;
  }
  const { accounts, sessions } = signIn;
  /** Starts a session for the account and answers with who is signed in. */
  const signedIn = (response: Response, account: AccountSession, status: number): void => {
    response.setHeader(
      'Set-Cookie',
      setSessionCookie(sessions.issue(account.uid, account.version)),
    );
    response.status(status).json({ email: account.email });
  };
  router.post('/auth/register', async (request, response) => {
    const parsed = credentialsSchema.safeParse(request.body);
    if (!parsed.success) {
      response
        .status(400)
        .json({ error: 'Enter a valid email and a password of 10 to 128 characters.' });
      return;
    }
    const account = await accounts.register(parsed.data.email, parsed.data.password);
    if (account === 'taken') {
      response.status(409).json({ error: 'That email already has an account. Sign in instead.' });
      return;
    }
    signedIn(response, account, 201);
  });
  router.post('/auth/login', async (request, response) => {
    const parsed = credentialsSchema.safeParse(request.body);
    const account = parsed.success
      ? await accounts.authenticate(parsed.data.email, parsed.data.password)
      : null;
    if (account === null) {
      response.status(401).json({ error: WRONG_CREDENTIALS });
      return;
    }
    signedIn(response, account, 200);
  });
  router.post('/auth/logout', (_request, response) => {
    response.setHeader('Set-Cookie', clearSessionCookie());
    response.status(204).end();
  });
  return router;
}
