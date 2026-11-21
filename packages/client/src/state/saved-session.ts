import { LANGUAGES, profileSchema } from '@vayu/core';
import { z } from 'zod';
import { INITIAL_SESSION, type SessionState } from './session.js';

/** Bump when the saved shape changes; older saves are then ignored, not misread. */
const STORAGE_KEY = 'vayu-session-v1';

/**
 * Only a confirmed plan is saved: the profile, the choices and the language.
 * It is validated with the same schema the server uses, so a hand-edited or
 * stale save can never feed the engine bad input.
 */
const savedSchema = z.object({
  profile: profileSchema,
  chosenIds: z.array(z.string().max(60)).max(25).nullable(),
  language: z.enum(LANGUAGES),
});

/** Restores a saved plan, or the start screen when there is none or it is invalid. */
export function readSavedSession(storage: Pick<Storage, 'getItem'> | undefined): SessionState {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (raw === null || raw === undefined) {
      return INITIAL_SESSION;
    }
    const parsed = savedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? { ...INITIAL_SESSION, ...parsed.data, stage: 'plan' } : INITIAL_SESSION;
  } catch {
    return INITIAL_SESSION;
  }
}

/** Saves the plan the family is on, or clears the save when there is none. */
export function writeSavedSession(
  storage: Pick<Storage, 'setItem' | 'removeItem'> | undefined,
  state: SessionState,
): void {
  try {
    if (state.profile === null || state.stage !== 'plan') {
      storage?.removeItem(STORAGE_KEY);
      return;
    }
    const { profile, chosenIds, language } = state;
    storage?.setItem(STORAGE_KEY, JSON.stringify({ profile, chosenIds, language }));
  } catch {
    // A plan we cannot store is still a plan; the family just re-enters it next time.
  }
}
