/**
 * One property of a value whose shape is not known (a thrown error, a parsed
 * body), read without asserting a type; undefined when it is not an object.
 */
export function fieldOf(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined;
  const field: unknown = Reflect.get(value, key);
  return field;
}
