import type { CustomPropertyType } from './custom-properties.constants';
import { CUSTOM_PROPERTY_TYPES } from './custom-properties.constants';
import { createCustomPropertyValueInvalidError } from './custom-properties.errors';

export function validateAndExtractPropertyValue({ type, value }: { type: CustomPropertyType; value: unknown }) {
  switch (type) {
    case CUSTOM_PROPERTY_TYPES.TEXT: {
      if (typeof value !== 'string') {
        throw createCustomPropertyValueInvalidError();
      }

      if (value.length > 10000) {
        throw createCustomPropertyValueInvalidError();
      }

      return { textValue: value };
    }

    case CUSTOM_PROPERTY_TYPES.NUMBER: {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw createCustomPropertyValueInvalidError();
      }

      return { numberValue: value };
    }

    case CUSTOM_PROPERTY_TYPES.DATE: {
      if (typeof value === 'string') {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
          throw createCustomPropertyValueInvalidError();
        }
        return { dateValue: date };
      }

      if (typeof value === 'number') {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
          throw createCustomPropertyValueInvalidError();
        }
        return { dateValue: date };
      }

      throw createCustomPropertyValueInvalidError();
    }

    case CUSTOM_PROPERTY_TYPES.BOOLEAN: {
      if (typeof value !== 'boolean') {
        throw createCustomPropertyValueInvalidError();
      }

      return { booleanValue: value };
    }

    case CUSTOM_PROPERTY_TYPES.SELECT: {
      if (typeof value !== 'string') {
        throw createCustomPropertyValueInvalidError();
      }

      return { selectOptionId: value };
    }

    case CUSTOM_PROPERTY_TYPES.MULTI_SELECT: {
      if (!Array.isArray(value) || !value.every(v => typeof v === 'string')) {
        throw createCustomPropertyValueInvalidError();
      }

      return { selectOptionIds: value };
    }

    default:
      throw createCustomPropertyValueInvalidError();
  }
}

type RawCustomPropertyValueRow = {
  value: {
    id: string;
    propertyDefinitionId: string;
    textValue: string | null;
    numberValue: number | null;
    dateValue: Date | null;
    booleanValue: boolean | null;
    selectOptionId: string | null;
  };
  definition: {
    id: string;
    name: string;
    key: string;
    type: string;
  };
  option: {
    id: string | null;
    name: string | null;
  } | null;
};

export function aggregateDocumentCustomPropertyValues({ rawValues }: { rawValues: RawCustomPropertyValueRow[] }) {
  const grouped = new Map<string, {
    propertyDefinitionId: string;
    key: string;
    name: string;
    type: string;
    value: unknown;
  }>();

  for (const row of rawValues) {
    const { definition, option } = row;
    const existing = grouped.get(definition.id);

    if (definition.type === CUSTOM_PROPERTY_TYPES.MULTI_SELECT) {
      if (!existing) {
        grouped.set(definition.id, {
          propertyDefinitionId: definition.id,
          key: definition.key,
          name: definition.name,
          type: definition.type,
          value: (option !== null && option !== undefined && option.id !== null && option.id !== undefined)
            ? [{ optionId: option.id, name: option.name }]
            : [],
        });
      } else if (option !== null && option !== undefined && option.id !== null && option.id !== undefined) {
        (existing.value as { optionId: string; name: string | null }[]).push({ optionId: option.id, name: option.name });
      }
    } else if (!existing) {
      grouped.set(definition.id, {
        propertyDefinitionId: definition.id,
        key: definition.key,
        name: definition.name,
        type: definition.type,
        value: resolveScalarValue({ row }),
      });
    }
  }

  return [...grouped.values()];
}

export type DocumentCustomPropertyForApi = {
  key: string;
  name: string;
  type: string;
  displayOrder: number;
  value: unknown;
};

export function buildCustomPropertiesArray({ rawValues, propertyDefinitions }: { rawValues: RawCustomPropertyValueRow[]; propertyDefinitions: { key: string; name: string; type: string; displayOrder: number }[] }): DocumentCustomPropertyForApi[] {
  const aggregated = aggregateDocumentCustomPropertyValues({ rawValues });
  const valuesByKey = Object.fromEntries(aggregated.map(({ key, value }) => [key, value]));

  return propertyDefinitions.map(def => ({
    key: def.key,
    name: def.name,
    type: def.type,
    displayOrder: def.displayOrder,
    value: valuesByKey[def.key] ?? null,
  }));
}

function resolveScalarValue({ row }: {
  row: {
    value: {
      textValue: string | null;
      numberValue: number | null;
      dateValue: Date | null;
      booleanValue: boolean | null;
      selectOptionId: string | null;
    };
    definition: { type: string };
    option: { id: string | null; name: string | null } | null;
  };
}) {
  switch (row.definition.type) {
    case CUSTOM_PROPERTY_TYPES.TEXT:
      return row.value.textValue;
    case CUSTOM_PROPERTY_TYPES.NUMBER:
      return row.value.numberValue;
    case CUSTOM_PROPERTY_TYPES.DATE:
      return row.value.dateValue;
    case CUSTOM_PROPERTY_TYPES.BOOLEAN:
      return row.value.booleanValue;
    case CUSTOM_PROPERTY_TYPES.SELECT:
      return (row.option !== null && row.option !== undefined && row.option.id !== null && row.option.id !== undefined)
        ? { optionId: row.option.id, name: row.option.name }
        : null;
    default:
      return null;
  }
}

export function isSelectLikePropertyType(type?: string): type is typeof CUSTOM_PROPERTY_TYPES.SELECT | typeof CUSTOM_PROPERTY_TYPES.MULTI_SELECT {
  return type === CUSTOM_PROPERTY_TYPES.SELECT || type === CUSTOM_PROPERTY_TYPES.MULTI_SELECT;
}
