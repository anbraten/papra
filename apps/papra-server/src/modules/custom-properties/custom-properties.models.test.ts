import { describe, expect, test } from 'vitest';
import { CUSTOM_PROPERTY_TYPES } from './custom-properties.constants';
import { aggregateDocumentCustomPropertyValues, buildCustomPropertiesArray, isSelectLikePropertyType, validateAndExtractPropertyValue } from './custom-properties.models';

describe('custom-properties models', () => {
  describe('validateAndExtractPropertyValue', () => {
    describe('text type', () => {
      test('accepts a valid string', () => {
        expect(validateAndExtractPropertyValue({ type: CUSTOM_PROPERTY_TYPES.TEXT, value: 'hello' }))
          .to
          .eql({ textValue: 'hello' });
      });

      test('rejects non-string values', () => {
        expect(() => validateAndExtractPropertyValue({ type: CUSTOM_PROPERTY_TYPES.TEXT, value: 123 }))
          .to
          .throw('The provided value is invalid for this property type.');
      });

      test('rejects strings longer than 10000 characters', () => {
        expect(() => validateAndExtractPropertyValue({ type: CUSTOM_PROPERTY_TYPES.TEXT, value: 'a'.repeat(10001) }))
          .to
          .throw('The provided value is invalid for this property type.');
      });

      test('accepts strings of exactly 10000 characters', () => {
        const longString = 'a'.repeat(10000);
        expect(validateAndExtractPropertyValue({ type: CUSTOM_PROPERTY_TYPES.TEXT, value: longString }))
          .to
          .eql({ textValue: longString });
      });
    });

    describe('number type', () => {
      test('accepts a valid number', () => {
        expect(validateAndExtractPropertyValue({ type: CUSTOM_PROPERTY_TYPES.NUMBER, value: 42 }))
          .to
          .eql({ numberValue: 42 });
      });

      test('accepts zero', () => {
        expect(validateAndExtractPropertyValue({ type: CUSTOM_PROPERTY_TYPES.NUMBER, value: 0 }))
          .to
          .eql({ numberValue: 0 });
      });

      test('accepts negative numbers', () => {
        expect(validateAndExtractPropertyValue({ type: CUSTOM_PROPERTY_TYPES.NUMBER, value: -1.5 }))
          .to
          .eql({ numberValue: -1.5 });
      });

      test('rejects NaN', () => {
        expect(() => validateAndExtractPropertyValue({ type: CUSTOM_PROPERTY_TYPES.NUMBER, value: Number.NaN }))
          .to
          .throw('The provided value is invalid for this property type.');
      });

      test('rejects Infinity', () => {
        expect(() => validateAndExtractPropertyValue({ type: CUSTOM_PROPERTY_TYPES.NUMBER, value: Number.POSITIVE_INFINITY }))
          .to
          .throw('The provided value is invalid for this property type.');
      });

      test('rejects non-number values', () => {
        expect(() => validateAndExtractPropertyValue({ type: CUSTOM_PROPERTY_TYPES.NUMBER, value: '42' }))
          .to
          .throw('The provided value is invalid for this property type.');
      });
    });

    describe('date type', () => {
      test('accepts an ISO 8601 string', () => {
        const result = validateAndExtractPropertyValue({ type: CUSTOM_PROPERTY_TYPES.DATE, value: '2024-01-15T00:00:00.000Z' });
        expect(result).to.have.property('dateValue');
        expect((result as { dateValue: Date }).dateValue.toISOString()).to.eql('2024-01-15T00:00:00.000Z');
      });

      test('accepts a timestamp number', () => {
        const timestamp = new Date('2024-01-15').getTime();
        const result = validateAndExtractPropertyValue({ type: CUSTOM_PROPERTY_TYPES.DATE, value: timestamp });
        expect(result).to.have.property('dateValue');
        expect((result as { dateValue: Date }).dateValue.getTime()).to.eql(timestamp);
      });

      test('rejects invalid date strings', () => {
        expect(() => validateAndExtractPropertyValue({ type: CUSTOM_PROPERTY_TYPES.DATE, value: 'not-a-date' }))
          .to
          .throw('The provided value is invalid for this property type.');
      });

      test('rejects non-string/number values', () => {
        expect(() => validateAndExtractPropertyValue({ type: CUSTOM_PROPERTY_TYPES.DATE, value: true }))
          .to
          .throw('The provided value is invalid for this property type.');
      });
    });

    describe('boolean type', () => {
      test('accepts true', () => {
        expect(validateAndExtractPropertyValue({ type: CUSTOM_PROPERTY_TYPES.BOOLEAN, value: true }))
          .to
          .eql({ booleanValue: true });
      });

      test('accepts false', () => {
        expect(validateAndExtractPropertyValue({ type: CUSTOM_PROPERTY_TYPES.BOOLEAN, value: false }))
          .to
          .eql({ booleanValue: false });
      });

      test('rejects non-boolean values', () => {
        expect(() => validateAndExtractPropertyValue({ type: CUSTOM_PROPERTY_TYPES.BOOLEAN, value: 1 }))
          .to
          .throw('The provided value is invalid for this property type.');
      });
    });

    describe('select type', () => {
      test('accepts a string option ID', () => {
        expect(validateAndExtractPropertyValue({ type: CUSTOM_PROPERTY_TYPES.SELECT, value: 'cpso_abc' }))
          .to
          .eql({ selectOptionId: 'cpso_abc' });
      });

      test('rejects non-string values', () => {
        expect(() => validateAndExtractPropertyValue({ type: CUSTOM_PROPERTY_TYPES.SELECT, value: 123 }))
          .to
          .throw('The provided value is invalid for this property type.');
      });
    });

    describe('multi_select type', () => {
      test('accepts an array of string option IDs', () => {
        expect(validateAndExtractPropertyValue({ type: CUSTOM_PROPERTY_TYPES.MULTI_SELECT, value: ['cpso_a', 'cpso_b'] }))
          .to
          .eql({ selectOptionIds: ['cpso_a', 'cpso_b'] });
      });

      test('accepts an empty array', () => {
        expect(validateAndExtractPropertyValue({ type: CUSTOM_PROPERTY_TYPES.MULTI_SELECT, value: [] }))
          .to
          .eql({ selectOptionIds: [] });
      });

      test('rejects non-array values', () => {
        expect(() => validateAndExtractPropertyValue({ type: CUSTOM_PROPERTY_TYPES.MULTI_SELECT, value: 'cpso_a' }))
          .to
          .throw('The provided value is invalid for this property type.');
      });

      test('rejects arrays with non-string elements', () => {
        expect(() => validateAndExtractPropertyValue({ type: CUSTOM_PROPERTY_TYPES.MULTI_SELECT, value: [1, 2] }))
          .to
          .throw('The provided value is invalid for this property type.');
      });
    });
  });

  describe('aggregateDocumentCustomPropertyValues', () => {
    test('aggregates scalar property values', () => {
      const result = aggregateDocumentCustomPropertyValues({
        rawValues: [
          {
            value: { id: 'v1', propertyDefinitionId: 'cpd_a', textValue: 'hello', numberValue: null, dateValue: null, booleanValue: null, selectOptionId: null },
            definition: { id: 'cpd_a', name: 'Name', key: 'name', type: 'text' },
            option: null,
          },
          {
            value: { id: 'v2', propertyDefinitionId: 'cpd_b', textValue: null, numberValue: 42, dateValue: null, booleanValue: null, selectOptionId: null },
            definition: { id: 'cpd_b', name: 'Amount', key: 'amount', type: 'number' },
            option: null,
          },
        ],
      });

      expect(result).to.eql([
        { propertyDefinitionId: 'cpd_a', key: 'name', name: 'Name', type: 'text', value: 'hello' },
        { propertyDefinitionId: 'cpd_b', key: 'amount', name: 'Amount', type: 'number', value: 42 },
      ]);
    });

    test('aggregates select property values', () => {
      const result = aggregateDocumentCustomPropertyValues({
        rawValues: [
          {
            value: { id: 'v1', propertyDefinitionId: 'cpd_a', textValue: null, numberValue: null, dateValue: null, booleanValue: null, selectOptionId: 'cpso_x' },
            definition: { id: 'cpd_a', name: 'Category', key: 'category', type: 'select' },
            option: { id: 'cpso_x', name: 'Finance' },
          },
        ],
      });

      expect(result).to.eql([
        { propertyDefinitionId: 'cpd_a', key: 'category', name: 'Category', type: 'select', value: { optionId: 'cpso_x', name: 'Finance' } },
      ]);
    });

    test('aggregates multi-select property values into arrays', () => {
      const result = aggregateDocumentCustomPropertyValues({
        rawValues: [
          {
            value: { id: 'v1', propertyDefinitionId: 'cpd_a', textValue: null, numberValue: null, dateValue: null, booleanValue: null, selectOptionId: 'cpso_1' },
            definition: { id: 'cpd_a', name: 'Labels', key: 'labels', type: 'multi_select' },
            option: { id: 'cpso_1', name: 'Urgent' },
          },
          {
            value: { id: 'v2', propertyDefinitionId: 'cpd_a', textValue: null, numberValue: null, dateValue: null, booleanValue: null, selectOptionId: 'cpso_2' },
            definition: { id: 'cpd_a', name: 'Labels', key: 'labels', type: 'multi_select' },
            option: { id: 'cpso_2', name: 'Review' },
          },
        ],
      });

      expect(result).to.eql([
        {
          propertyDefinitionId: 'cpd_a',
          key: 'labels',
          name: 'Labels',
          type: 'multi_select',
          value: [
            { optionId: 'cpso_1', name: 'Urgent' },
            { optionId: 'cpso_2', name: 'Review' },
          ],
        },
      ]);
    });

    test('returns an empty array for no values', () => {
      expect(aggregateDocumentCustomPropertyValues({ rawValues: [] })).to.eql([]);
    });
  });

  describe('buildCustomPropertiesArray', () => {
    const def = (key: string, name: string, type: string, displayOrder: number) => ({ key, name, type, displayOrder });

    test('returns an array with definition info and values', () => {
      const result = buildCustomPropertiesArray({
        propertyDefinitions: [def('name', 'Name', 'text', 0), def('amount', 'Amount', 'number', 1)],
        rawValues: [
          {
            value: { id: 'v1', propertyDefinitionId: 'cpd_a', textValue: 'hello', numberValue: null, dateValue: null, booleanValue: null, selectOptionId: null },
            definition: { id: 'cpd_a', name: 'Name', key: 'name', type: 'text' },
            option: null,
          },
          {
            value: { id: 'v2', propertyDefinitionId: 'cpd_b', textValue: null, numberValue: 42, dateValue: null, booleanValue: null, selectOptionId: null },
            definition: { id: 'cpd_b', name: 'Amount', key: 'amount', type: 'number' },
            option: null,
          },
        ],
      });

      expect(result).to.eql([
        { key: 'name', name: 'Name', type: 'text', displayOrder: 0, value: 'hello' },
        { key: 'amount', name: 'Amount', type: 'number', displayOrder: 1, value: 42 },
      ]);
    });

    test('includes null value for definitions with no value set', () => {
      const result = buildCustomPropertiesArray({
        propertyDefinitions: [def('name', 'Name', 'text', 0), def('amount', 'Amount', 'number', 1)],
        rawValues: [
          {
            value: { id: 'v1', propertyDefinitionId: 'cpd_a', textValue: 'hello', numberValue: null, dateValue: null, booleanValue: null, selectOptionId: null },
            definition: { id: 'cpd_a', name: 'Name', key: 'name', type: 'text' },
            option: null,
          },
        ],
      });

      expect(result).to.eql([
        { key: 'name', name: 'Name', type: 'text', displayOrder: 0, value: 'hello' },
        { key: 'amount', name: 'Amount', type: 'number', displayOrder: 1, value: null },
      ]);
    });

    test('returns all nulls when no values are set', () => {
      expect(buildCustomPropertiesArray({
        propertyDefinitions: [def('name', 'Name', 'text', 0), def('amount', 'Amount', 'number', 1)],
        rawValues: [],
      })).to.eql([
        { key: 'name', name: 'Name', type: 'text', displayOrder: 0, value: null },
        { key: 'amount', name: 'Amount', type: 'number', displayOrder: 1, value: null },
      ]);
    });

    test('returns an empty array when there are no definitions', () => {
      expect(buildCustomPropertiesArray({ propertyDefinitions: [], rawValues: [] })).to.eql([]);
    });
  });

  describe('isSelectLikePropertyType', () => {
    test('custom property type is select-like when it is select or multi-select', () => {
      expect(isSelectLikePropertyType(CUSTOM_PROPERTY_TYPES.SELECT)).to.eql(true);
      expect(isSelectLikePropertyType(CUSTOM_PROPERTY_TYPES.MULTI_SELECT)).to.eql(true);

      expect(isSelectLikePropertyType(CUSTOM_PROPERTY_TYPES.TEXT)).to.eql(false);
      expect(isSelectLikePropertyType(CUSTOM_PROPERTY_TYPES.NUMBER)).to.eql(false);
      expect(isSelectLikePropertyType(CUSTOM_PROPERTY_TYPES.DATE)).to.eql(false);
      expect(isSelectLikePropertyType(CUSTOM_PROPERTY_TYPES.BOOLEAN)).to.eql(false);

      expect(isSelectLikePropertyType(undefined)).to.eql(false);
      expect(isSelectLikePropertyType('unknown_type')).to.eql(false);
    });
  });
});
