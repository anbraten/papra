import { describe, expect, test } from 'vitest';
import { createInMemoryDatabase, seedDatabase } from '../app/database/database.test-utils';
import { CUSTOM_PROPERTY_TYPES } from './custom-properties.constants';
import { createCustomPropertyDefinitionAlreadyExistsError, createCustomPropertySelectOptionUnknownIdError } from './custom-properties.errors';
import { createCustomPropertiesRepository } from './custom-properties.repository';

describe('custom-properties repository', () => {
  describe('property definitions', () => {
    test('can create and retrieve a property definition', async () => {
      const orgId = 'org_111111111111111111111111';
      const docId = 'doc_111111111111111111111111';

      const { db } = await createInMemoryDatabase({
        organizations: [{ id: orgId, name: 'Test Org' }],
        documents: [{ id: docId, organizationId: orgId, name: 'test.pdf', originalName: 'test.pdf', mimeType: 'application/pdf', originalSha256Hash: 'abc', originalSize: 100, originalStorageKey: 'key' }],
      });

      const repository = createCustomPropertiesRepository({ db });

      const { propertyDefinition: created } = await repository.createPropertyDefinition({
        definition: { organizationId: orgId, name: 'Invoice Number', type: CUSTOM_PROPERTY_TYPES.TEXT },
      });

      expect(created).to.include({ name: 'Invoice Number', type: 'text', organizationId: orgId });

      const { propertyDefinitions } = await repository.getOrganizationPropertyDefinitions({ organizationId: orgId });
      expect(propertyDefinitions).to.have.length(1);
      expect(propertyDefinitions[0]).to.include({ name: 'Invoice Number' });
      expect(propertyDefinitions[0]?.options).to.eql([]);
    });

    test('can get a single property definition by ID', async () => {
      const orgId = 'org_111111111111111111111111';
      const docId = 'doc_111111111111111111111111';

      const { db } = await createInMemoryDatabase({
        organizations: [{ id: orgId, name: 'Test Org' }],
        documents: [{ id: docId, organizationId: orgId, name: 'test.pdf', originalName: 'test.pdf', mimeType: 'application/pdf', originalSha256Hash: 'abc', originalSize: 100, originalStorageKey: 'key' }],
      });

      const repository = createCustomPropertiesRepository({ db });

      const { propertyDefinition: created } = await repository.createPropertyDefinition({
        definition: { organizationId: orgId, name: 'Amount', type: CUSTOM_PROPERTY_TYPES.NUMBER },
      });

      const { definition } = await repository.getPropertyDefinitionById({ propertyDefinitionId: created.id, organizationId: orgId });
      expect(definition).to.include({ name: 'Amount', type: 'number' });
    });

    test('returns undefined for non-existent definition', async () => {
      const orgId = 'org_111111111111111111111111';
      const docId = 'doc_111111111111111111111111';

      const { db } = await createInMemoryDatabase({
        organizations: [{ id: orgId, name: 'Test Org' }],
        documents: [{ id: docId, organizationId: orgId, name: 'test.pdf', originalName: 'test.pdf', mimeType: 'application/pdf', originalSha256Hash: 'abc', originalSize: 100, originalStorageKey: 'key' }],
      });

      const repository = createCustomPropertiesRepository({ db });

      const { definition } = await repository.getPropertyDefinitionById({ propertyDefinitionId: 'cpd_nonexistent000000000000', organizationId: orgId });
      expect(definition).to.eql(undefined);
    });

    test('can count property definitions', async () => {
      const orgId = 'org_111111111111111111111111';
      const docId = 'doc_111111111111111111111111';

      const { db } = await createInMemoryDatabase({
        organizations: [{ id: orgId, name: 'Test Org' }],
        documents: [{ id: docId, organizationId: orgId, name: 'test.pdf', originalName: 'test.pdf', mimeType: 'application/pdf', originalSha256Hash: 'abc', originalSize: 100, originalStorageKey: 'key' }],
      });

      const repository = createCustomPropertiesRepository({ db });

      await repository.createPropertyDefinition({ definition: { organizationId: orgId, name: 'A', type: CUSTOM_PROPERTY_TYPES.TEXT } });
      await repository.createPropertyDefinition({ definition: { organizationId: orgId, name: 'B', type: CUSTOM_PROPERTY_TYPES.NUMBER } });

      const { count } = await repository.getOrganizationPropertyDefinitionsCount({ organizationId: orgId });
      expect(count).to.eql(2);
    });

    test('can update a property definition', async () => {
      const orgId = 'org_111111111111111111111111';
      const docId = 'doc_111111111111111111111111';

      const { db } = await createInMemoryDatabase({
        organizations: [{ id: orgId, name: 'Test Org' }],
        documents: [{ id: docId, organizationId: orgId, name: 'test.pdf', originalName: 'test.pdf', mimeType: 'application/pdf', originalSha256Hash: 'abc', originalSize: 100, originalStorageKey: 'key' }],
      });

      const repository = createCustomPropertiesRepository({ db });

      const { propertyDefinition: created } = await repository.createPropertyDefinition({
        definition: { organizationId: orgId, name: 'Old Name', type: CUSTOM_PROPERTY_TYPES.TEXT },
      });

      const { propertyDefinition: updated } = await repository.updatePropertyDefinition({
        propertyDefinitionId: created.id,
        organizationId: orgId,
        name: 'New Name',
      });

      expect(updated).to.include({ name: 'New Name' });
    });

    test('can delete a property definition', async () => {
      const orgId = 'org_111111111111111111111111';
      const docId = 'doc_111111111111111111111111';

      const { db } = await createInMemoryDatabase({
        organizations: [{ id: orgId, name: 'Test Org' }],
        documents: [{ id: docId, organizationId: orgId, name: 'test.pdf', originalName: 'test.pdf', mimeType: 'application/pdf', originalSha256Hash: 'abc', originalSize: 100, originalStorageKey: 'key' }],
      });

      const repository = createCustomPropertiesRepository({ db });

      const { propertyDefinition: created } = await repository.createPropertyDefinition({
        definition: { organizationId: orgId, name: 'To Delete', type: CUSTOM_PROPERTY_TYPES.TEXT },
      });

      await repository.deletePropertyDefinition({ propertyDefinitionId: created.id, organizationId: orgId });

      const { propertyDefinitions } = await repository.getOrganizationPropertyDefinitions({ organizationId: orgId });
      expect(propertyDefinitions).to.have.length(0);
    });

    test('throws on duplicate name within organization', async () => {
      const orgId = 'org_111111111111111111111111';
      const docId = 'doc_111111111111111111111111';

      const { db } = await createInMemoryDatabase({
        organizations: [{ id: orgId, name: 'Test Org' }],
        documents: [{ id: docId, organizationId: orgId, name: 'test.pdf', originalName: 'test.pdf', mimeType: 'application/pdf', originalSha256Hash: 'abc', originalSize: 100, originalStorageKey: 'key' }],
      });

      const repository = createCustomPropertiesRepository({ db });

      await repository.createPropertyDefinition({ definition: { organizationId: orgId, name: 'Unique', type: CUSTOM_PROPERTY_TYPES.TEXT } });

      await expect(
        repository.createPropertyDefinition({ definition: { organizationId: orgId, name: 'Unique', type: CUSTOM_PROPERTY_TYPES.NUMBER } }),
      ).rejects.toThrow(createCustomPropertyDefinitionAlreadyExistsError());
    });
  });

  describe('syncSelectOptions', () => {
    test('creates new options when none exist', async () => {
      const orgId = 'org_111111111111111111111111';
      const { db } = await createInMemoryDatabase({ organizations: [{ id: orgId, name: 'Test Org' }] });
      const repository = createCustomPropertiesRepository({ db });

      const { propertyDefinition } = await repository.createPropertyDefinition({ definition: { organizationId: orgId, name: 'Status', type: CUSTOM_PROPERTY_TYPES.SELECT } });
      const propertyDefinitionId = propertyDefinition.id;

      await repository.syncSelectOptions({ propertyDefinitionId, options: [{ name: 'Open' }, { name: 'Closed' }] });
      const { definition } = await repository.getPropertyDefinitionById({ propertyDefinitionId, organizationId: orgId });

      expect(
        definition?.options.map(o => ({ name: o.name, displayOrder: o.displayOrder })),
      ).to.eql([
        { name: 'Open', displayOrder: 0 },
        { name: 'Closed', displayOrder: 1 },
      ]);
    });

    test('assigns displayOrder based on array position', async () => {
      const orgId = 'org_111111111111111111111111';
      const { db } = await createInMemoryDatabase({ organizations: [{ id: orgId, name: 'Test Org' }] });
      const repository = createCustomPropertiesRepository({ db });

      const { propertyDefinition } = await repository.createPropertyDefinition({ definition: { organizationId: orgId, name: 'Status', type: CUSTOM_PROPERTY_TYPES.SELECT } });
      const propertyDefinitionId = propertyDefinition.id;

      await repository.syncSelectOptions({ propertyDefinitionId, options: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] });

      const { definition } = await repository.getPropertyDefinitionById({ propertyDefinitionId, organizationId: orgId });
      expect(
        definition?.options.map(o => ({ name: o.name, displayOrder: o.displayOrder })),
      ).to.eql([
        { name: 'A', displayOrder: 0 },
        { name: 'B', displayOrder: 1 },
        { name: 'C', displayOrder: 2 },
      ]);
    });

    test('updates existing options by ID', async () => {
      const orgId = 'org_111111111111111111111111';
      const { db } = await createInMemoryDatabase({ organizations: [{ id: orgId, name: 'Test Org' }] });
      const repository = createCustomPropertiesRepository({ db });

      const { propertyDefinition } = await repository.createPropertyDefinition({ definition: { organizationId: orgId, name: 'Status', type: CUSTOM_PROPERTY_TYPES.SELECT } });
      const propertyDefinitionId = propertyDefinition.id;

      await repository.syncSelectOptions({ propertyDefinitionId, options: [{ name: 'Draft' }] }); // Create initial option
      const { definition: before } = await repository.getPropertyDefinitionById({ propertyDefinitionId, organizationId: orgId });

      expect(
        before?.options.map(o => ({ name: o.name, displayOrder: o.displayOrder })),
      ).to.eql([
        { name: 'Draft', displayOrder: 0 },
      ]);

      const [option] = before?.options ?? [];
      expect.assert(option);

      await repository.syncSelectOptions({ propertyDefinitionId, options: [{ id: option.id, name: 'Published' }] });

      const { definition: after } = await repository.getPropertyDefinitionById({ propertyDefinitionId, organizationId: orgId });

      expect(
        after?.options.map(o => ({ name: o.name, displayOrder: o.displayOrder, id: o.id })),
      ).to.eql([
        {
          id: option.id,
          name: 'Published',
          displayOrder: 0,
        },
      ]);
    });

    test('deletes options omitted from the incoming list', async () => {
      const orgId = 'org_111111111111111111111111';
      const { db } = await createInMemoryDatabase({ organizations: [{ id: orgId, name: 'Test Org' }] });
      const repository = createCustomPropertiesRepository({ db });

      const { propertyDefinition } = await repository.createPropertyDefinition({ definition: { organizationId: orgId, name: 'Status', type: CUSTOM_PROPERTY_TYPES.SELECT } });
      const propertyDefinitionId = propertyDefinition.id;

      await repository.syncSelectOptions({ propertyDefinitionId, options: [{ name: 'Keep' }, { name: 'Remove' }] });
      const { definition: before } = await repository.getPropertyDefinitionById({ propertyDefinitionId, organizationId: orgId });

      expect(
        before?.options.map(o => ({ name: o.name, displayOrder: o.displayOrder })),
      ).to.eql([
        { name: 'Keep', displayOrder: 0 },
        { name: 'Remove', displayOrder: 1 },
      ]);

      const [keep] = before?.options ?? [];
      expect.assert(keep);

      await repository.syncSelectOptions({ propertyDefinitionId, options: [{ id: keep.id, name: 'Keep' }] });
      const { definition: after } = await repository.getPropertyDefinitionById({ propertyDefinitionId, organizationId: orgId });

      expect(
        after?.options.map(o => ({ name: o.name, displayOrder: o.displayOrder })),
      ).to.eql([
        { name: 'Keep', displayOrder: 0 },
      ]);
    });

    test('handles mixed create, update, and delete in one call', async () => {
      const orgId = 'org_111111111111111111111111';
      const { db } = await createInMemoryDatabase({ organizations: [{ id: orgId, name: 'Test Org' }] });
      const repository = createCustomPropertiesRepository({ db });

      const { propertyDefinition } = await repository.createPropertyDefinition({ definition: { organizationId: orgId, name: 'Status', type: CUSTOM_PROPERTY_TYPES.SELECT } });
      const propertyDefinitionId = propertyDefinition.id;

      await repository.syncSelectOptions({ propertyDefinitionId, options: [{ name: 'Old' }, { name: 'ToDelete' }] });
      const { definition: before } = await repository.getPropertyDefinitionById({ propertyDefinitionId, organizationId: orgId });
      const [old] = before?.options ?? [];
      expect.assert(old);

      await repository.syncSelectOptions({ propertyDefinitionId, options: [{ id: old.id, name: 'Updated' }, { name: 'New' }] });

      const { definition: after } = await repository.getPropertyDefinitionById({ propertyDefinitionId, organizationId: orgId });
      expect(after?.options).to.have.length(2);
      expect(after?.options.map(o => o.name)).to.eql(['Updated', 'New']);
    });

    test('is a no-op when the incoming list is empty and there are no existing options', async () => {
      const orgId = 'org_111111111111111111111111';
      const { db } = await createInMemoryDatabase({ organizations: [{ id: orgId, name: 'Test Org' }] });
      const repository = createCustomPropertiesRepository({ db });

      const { propertyDefinition } = await repository.createPropertyDefinition({ definition: { organizationId: orgId, name: 'Status', type: CUSTOM_PROPERTY_TYPES.SELECT } });
      const propertyDefinitionId = propertyDefinition.id;

      await repository.syncSelectOptions({ propertyDefinitionId, options: [] });

      const { definition } = await repository.getPropertyDefinitionById({ propertyDefinitionId, organizationId: orgId });
      expect(definition?.options).to.have.length(0);
    });

    test('deletes all options when an empty list is provided', async () => {
      const orgId = 'org_111111111111111111111111';
      const { db } = await createInMemoryDatabase({ organizations: [{ id: orgId, name: 'Test Org' }] });
      const repository = createCustomPropertiesRepository({ db });

      const { propertyDefinition } = await repository.createPropertyDefinition({ definition: { organizationId: orgId, name: 'Status', type: CUSTOM_PROPERTY_TYPES.SELECT } });
      const propertyDefinitionId = propertyDefinition.id;

      await repository.syncSelectOptions({ propertyDefinitionId, options: [{ name: 'A' }, { name: 'B' }] });
      const { definition: before } = await repository.getPropertyDefinitionById({ propertyDefinitionId, organizationId: orgId });
      expect(before?.options).to.have.length(2);

      await repository.syncSelectOptions({ propertyDefinitionId, options: [] });

      const { definition } = await repository.getPropertyDefinitionById({ propertyDefinitionId, organizationId: orgId });
      expect(definition?.options).to.eql([]);
    });

    test('throws when an unknown option ID is provided', async () => {
      const orgId = 'org_111111111111111111111111';
      const { db } = await createInMemoryDatabase({ organizations: [{ id: orgId, name: 'Test Org' }] });
      const repository = createCustomPropertiesRepository({ db });

      const { propertyDefinition } = await repository.createPropertyDefinition({ definition: { organizationId: orgId, name: 'Status', type: CUSTOM_PROPERTY_TYPES.SELECT } });
      const propertyDefinitionId = propertyDefinition.id;

      await expect(
        repository.syncSelectOptions({ propertyDefinitionId, options: [{ id: 'non-existent', name: 'Ghost' }] }),
      ).rejects.toThrow(createCustomPropertySelectOptionUnknownIdError());
    });

    test('does not wipe existing options when a foreign ID is provided', async () => {
      const orgId = 'org_111111111111111111111111';
      const { db } = await createInMemoryDatabase({ organizations: [{ id: orgId, name: 'Test Org' }] });
      const repository = createCustomPropertiesRepository({ db });

      const { propertyDefinition } = await repository.createPropertyDefinition({ definition: { organizationId: orgId, name: 'Status', type: CUSTOM_PROPERTY_TYPES.SELECT } });
      const propertyDefinitionId = propertyDefinition.id;

      await repository.syncSelectOptions({ propertyDefinitionId, options: [{ name: 'Safe' }] });

      await expect(
        repository.syncSelectOptions({ propertyDefinitionId, options: [{ id: 'cso_nonexistent000000000000', name: 'Attacker' }] }),
      ).rejects.toThrow(createCustomPropertySelectOptionUnknownIdError());

      const { definition } = await repository.getPropertyDefinitionById({ propertyDefinitionId, organizationId: orgId });
      expect(definition?.options).to.have.length(1);
      expect(definition?.options[0]?.name).to.eql('Safe');
    });
  });

  describe('document property values', () => {
    test('setting a value replaces the previous value', async () => {
      const orgId = 'org_111111111111111111111111';
      const docId = 'doc_111111111111111111111111';
      const { db } = await createInMemoryDatabase({ organizations: [{ id: orgId, name: 'Test Org' }] });
      await seedDatabase({ db, documents: [{ id: docId, organizationId: orgId, name: 'test.pdf', originalName: 'test.pdf', mimeType: 'application/pdf', originalSha256Hash: 'abc', originalSize: 100, originalStorageKey: 'key' }] });
      const repository = createCustomPropertiesRepository({ db });

      const { propertyDefinition } = await repository.createPropertyDefinition({ definition: { organizationId: orgId, name: 'Note', type: CUSTOM_PROPERTY_TYPES.TEXT } });
      const propertyDefinitionId = propertyDefinition.id;

      await repository.setDocumentCustomPropertyValue({ documentId: docId, propertyDefinitionId, values: [{ textValue: 'Old' }] });
      await repository.setDocumentCustomPropertyValue({ documentId: docId, propertyDefinitionId, values: [{ textValue: 'New' }] });

      const { values } = await repository.getDocumentCustomPropertyValues({ documentId: docId });
      expect(values).to.have.length(1);
      expect(values[0]?.value.textValue).to.eql('New');
    });

    test('can delete a document property value', async () => {
      const orgId = 'org_111111111111111111111111';
      const docId = 'doc_111111111111111111111111';
      const { db } = await createInMemoryDatabase({ organizations: [{ id: orgId, name: 'Test Org' }] });
      await seedDatabase({ db, documents: [{ id: docId, organizationId: orgId, name: 'test.pdf', originalName: 'test.pdf', mimeType: 'application/pdf', originalSha256Hash: 'abc', originalSize: 100, originalStorageKey: 'key' }] });
      const repository = createCustomPropertiesRepository({ db });

      const { propertyDefinition } = await repository.createPropertyDefinition({ definition: { organizationId: orgId, name: 'Note', type: CUSTOM_PROPERTY_TYPES.TEXT } });
      const propertyDefinitionId = propertyDefinition.id;

      await repository.setDocumentCustomPropertyValue({ documentId: docId, propertyDefinitionId, values: [{ textValue: 'Hello' }] });
      await repository.deleteDocumentCustomPropertyValue({ documentId: docId, propertyDefinitionId });

      const { values } = await repository.getDocumentCustomPropertyValues({ documentId: docId });
      expect(values).to.have.length(0);
    });

    test('cascade deletes values when definition is deleted', async () => {
      const orgId = 'org_111111111111111111111111';
      const docId = 'doc_111111111111111111111111';
      const { db } = await createInMemoryDatabase({ organizations: [{ id: orgId, name: 'Test Org' }] });
      await seedDatabase({ db, documents: [{ id: docId, organizationId: orgId, name: 'test.pdf', originalName: 'test.pdf', mimeType: 'application/pdf', originalSha256Hash: 'abc', originalSize: 100, originalStorageKey: 'key' }] });
      const repository = createCustomPropertiesRepository({ db });

      const { propertyDefinition } = await repository.createPropertyDefinition({ definition: { organizationId: orgId, name: 'Note', type: CUSTOM_PROPERTY_TYPES.TEXT } });
      const propertyDefinitionId = propertyDefinition.id;

      await repository.setDocumentCustomPropertyValue({ documentId: docId, propertyDefinitionId, values: [{ textValue: 'Hello' }] });
      await repository.deletePropertyDefinition({ propertyDefinitionId, organizationId: orgId });

      const { values } = await repository.getDocumentCustomPropertyValues({ documentId: docId });
      expect(values).to.have.length(0);
    });
  });
});
