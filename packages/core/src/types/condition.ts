/** A value the household context exposes to declarative rules. */
export type ContextValue = string | number | boolean | readonly string[];

/** Facts about one household on one day, keyed by name, for catalogue conditions. */
export type HouseholdContext = Readonly<Record<string, ContextValue>>;

/**
 * A declarative predicate over the household context.
 *
 * Actions and health alerts carry these instead of code, so new clean-air
 * knowledge is added as data and evaluated by one tested function.
 */
export type Condition =
  | { readonly field: string; readonly equals: string | number | boolean }
  | { readonly field: string; readonly oneOf: readonly string[] }
  | { readonly field: string; readonly atLeast: number }
  | { readonly field: string; readonly below: number }
  | { readonly field: string; readonly has: string }
  | { readonly field: string; readonly hasAny: readonly string[] }
  | { readonly all: readonly Condition[] }
  | { readonly any: readonly Condition[] }
  | { readonly not: Condition };
