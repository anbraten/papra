export function rawPropertyValueAsOption(value: unknown): { optionId: string; name: string } | null {
  if (
    typeof value === 'object'
    && value !== null
    && 'optionId' in value
    && typeof value.optionId === 'string'
    && 'name' in value
    && typeof value.name === 'string'
  ) {
    return { optionId: value.optionId, name: value.name };
  }
  return null;
}

export function rawPropertyValueAsOptionArray(value: unknown): { optionId: string; name: string }[] {
  if (Array.isArray(value)) {
    return value.map(rawPropertyValueAsOption).filter(v => v !== null);
  }
  return [];
}
