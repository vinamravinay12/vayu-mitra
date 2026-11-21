import type { Condition, ContextValue, HouseholdContext } from '../types/condition.js';

type LeafCondition = Extract<Condition, { readonly field: string }>;

/** The value when it is a number, otherwise undefined. */
const asNumber = (value: ContextValue | undefined): number | undefined =>
  typeof value === 'number' ? value : undefined;

/** The value when it is a list, otherwise an empty list. */
const asList = (value: ContextValue | undefined): readonly string[] =>
  typeof value === 'object' ? value : [];

/** Evaluates a single comparison against one context field. */
function evaluateLeaf(condition: LeafCondition, context: HouseholdContext): boolean {
  const fieldValue = context[condition.field];
  if ('equals' in condition) {
    return fieldValue === condition.equals;
  }
  if ('oneOf' in condition) {
    return typeof fieldValue === 'string' && condition.oneOf.includes(fieldValue);
  }
  if ('has' in condition) {
    return asList(fieldValue).includes(condition.has);
  }
  if ('hasAny' in condition) {
    return condition.hasAny.some((value) => asList(fieldValue).includes(value));
  }
  const number = asNumber(fieldValue);
  if (number === undefined) {
    return false;
  }
  return 'atLeast' in condition ? number >= condition.atLeast : number < condition.below;
}

/**
 * Evaluates a declarative condition.
 *
 * A missing field is false rather than an error: a rule that cannot be decided
 * for this household simply does not apply to it.
 */
export function evaluateCondition(condition: Condition, context: HouseholdContext): boolean {
  if ('all' in condition) {
    return condition.all.every((part) => evaluateCondition(part, context));
  }
  if ('any' in condition) {
    return condition.any.some((part) => evaluateCondition(part, context));
  }
  if ('not' in condition) {
    return !evaluateCondition(condition.not, context);
  }
  return evaluateLeaf(condition, context);
}

/** Every field a condition reads, so catalogue tests can check each one exists. */
export function fieldsOf(condition: Condition): string[] {
  if ('all' in condition) {
    return condition.all.flatMap(fieldsOf);
  }
  if ('any' in condition) {
    return condition.any.flatMap(fieldsOf);
  }
  if ('not' in condition) {
    return fieldsOf(condition.not);
  }
  return [condition.field];
}
