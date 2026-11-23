/** A failure with a message written for people, safe to show as is. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** The signed-in user's ID token, or null when sign-in is off. */
export type TokenSource = () => Promise<string | null>;

const FALLBACK = 'Something went wrong. Please try again.';

/** The server's error text is written for people; anything else gets a safe generic line. */
async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === 'string' ? body.error : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

/** What a request sends: method and an optional JSON body. */
export interface JsonRequest {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly body?: unknown;
}

/**
 * Sends a request with the user's token and returns the parsed body (null for
 * an empty answer), turning any failure into an ApiError.
 */
export async function requestJson(
  path: string,
  token: TokenSource,
  { method = 'GET', body }: JsonRequest = {},
): Promise<unknown> {
  const idToken = await token();
  const headers: Record<string, string> = {};
  if (idToken !== null) headers.Authorization = `Bearer ${idToken}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError('We could not reach Vayu Mitra. Check your connection and try again.');
  }
  if (!response.ok) {
    throw new ApiError(await errorMessage(response), response.status);
  }
  return response.status === 204 ? null : ((await response.json()) as unknown);
}

/** Parses with a schema, or throws a readable error naming what came back incomplete. */
export function expectShape<T>(
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } },
  value: unknown,
  what: string,
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new ApiError(`The ${what} came back incomplete. Please try again.`);
  }
  return parsed.data;
}
