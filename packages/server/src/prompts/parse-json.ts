/**
 * Parses a model response that should be one JSON object.
 *
 * Responses are schema-constrained, so this is a defensive step: a code fence or
 * stray prose around the object is tolerated, anything unparseable is undefined.
 */
export function parseJson(raw: string): unknown {
  const objectStart = raw.indexOf('{');
  const objectEnd = raw.lastIndexOf('}');
  if (objectStart === -1 || objectEnd < objectStart) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(raw.slice(objectStart, objectEnd + 1));
    return parsed;
  } catch {
    return undefined;
  }
}
