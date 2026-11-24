/** One JSON request to our own API, with failures turned into errors written for people. */

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

const FALLBACK = 'Something went wrong. Please try again.';

/** The server's error text is written for people; anything else gets a safe generic line. */
async function errorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    const error: unknown =
      typeof body === 'object' && body !== null ? Reflect.get(body, 'error') : null;
    return typeof error === 'string' ? error : FALLBACK;
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
 * Sends a request and returns the parsed body (null for an empty answer),
 * turning any failure into an ApiError. The session travels in its HttpOnly
 * cookie, which the browser sends to our own origin by itself.
 */
export async function requestJson(
  path: string,
  { method = 'GET', body }: JsonRequest = {},
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      ...(body === undefined
        ? {}
        : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError('We could not reach Vayu Mitra. Check your connection and try again.');
  }
  if (!response.ok) {
    throw new ApiError(await errorMessage(response), response.status);
  }
  if (response.status === 204) return null;
  const parsed: unknown = await response.json();
  return parsed;
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
