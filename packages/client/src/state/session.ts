import {
  completeProfile,
  EMPTY_DRAFT,
  type Home,
  type HouseholdProfile,
  type Language,
  type Lifestyle,
  type Member,
  type Place,
} from '@vayu/core';
import type { ExtractResponse } from '../api/client.js';

/** The three screens: describe the family, check the profile, see the plan. */
export type Stage = 'start' | 'review' | 'plan';

/** The profile while the family is still checking it: the place may not be chosen yet. */
export interface EditableProfile {
  readonly place: Place | null;
  readonly placeQuery: string;
  readonly members: readonly Member[];
  readonly home: Home;
  readonly lifestyle: Lifestyle;
  /** Fields the AI or the defaults filled in, for the form to flag. */
  readonly assumed: readonly string[];
}

export interface SessionState {
  readonly stage: Stage;
  readonly editing: EditableProfile | null;
  readonly profile: HouseholdProfile | null;
  /** Null means "use the engine's recommended starting plan". */
  readonly chosenIds: readonly string[] | null;
  readonly language: Language;
}

export type SessionAction =
  | { readonly type: 'extracted'; readonly extracted: ExtractResponse }
  | { readonly type: 'fill-manually' }
  | { readonly type: 'confirm'; readonly profile: HouseholdProfile }
  | { readonly type: 'edit' }
  | { readonly type: 'choose'; readonly chosenIds: readonly string[] }
  | { readonly type: 'language'; readonly language: Language }
  | { readonly type: 'start-over' };

export const INITIAL_SESSION: SessionState = {
  stage: 'start',
  editing: null,
  profile: null,
  chosenIds: null,
  language: 'en',
};

/** An empty, editable profile with every default flagged as assumed. */
export function blankEditable(): EditableProfile {
  const completed = completeProfile(EMPTY_DRAFT);
  return { ...completed, place: null, placeQuery: '' };
}

/** The profile being edited, starting from the confirmed one when there is one. */
const editableFrom = (profile: HouseholdProfile): EditableProfile => ({
  ...profile,
  placeQuery: profile.place.name,
  assumed: [],
});

/**
 * Every state change in one pure function, so the flow can be tested without
 * rendering. Confirming a new profile resets choices to the recommended plan,
 * because the old choices were made for a different household.
 */
export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'extracted':
      return {
        ...state,
        stage: 'review',
        editing: {
          ...action.extracted,
          place: null,
          placeQuery: action.extracted.placeQuery ?? '',
        },
      };
    case 'fill-manually':
      return { ...state, stage: 'review', editing: blankEditable() };
    case 'confirm':
      return { ...state, stage: 'plan', profile: action.profile, editing: null, chosenIds: null };
    case 'edit':
      return state.profile === null
        ? state
        : { ...state, stage: 'review', editing: editableFrom(state.profile) };
    case 'choose':
      return { ...state, chosenIds: action.chosenIds };
    case 'language':
      return { ...state, language: action.language };
    case 'start-over':
      return { ...INITIAL_SESSION, language: state.language };
  }
}
