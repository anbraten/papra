import type { Config } from '../config/config.types';
import type { CustomPropertyType } from './custom-properties.constants';
import type { CustomPropertiesRepository } from './custom-properties.repository';
import { createCustomPropertyDefinitionNotFoundError, createCustomPropertySelectOptionNotFoundError, createOrganizationCustomPropertyLimitReachedError } from './custom-properties.errors';
import { isSelectLikePropertyType, validateAndExtractPropertyValue } from './custom-properties.models';

export async function createPropertyDefinition({
  organizationId,
  name,
  description,
  type,
  displayOrder,
  options,
  config,
  customPropertiesRepository,
}: {
  organizationId: string;
  name: string;
  description?: string | null;
  type: CustomPropertyType;
  displayOrder?: number;
  options?: { name: string }[];
  config: Config;
  customPropertiesRepository: CustomPropertiesRepository;
}) {
  const { count } = await customPropertiesRepository.getOrganizationPropertyDefinitionsCount({ organizationId });

  if (count >= config.customProperties.maxCustomPropertiesPerOrganization) {
    throw createOrganizationCustomPropertyLimitReachedError();
  }

  const { propertyDefinition } = await customPropertiesRepository.createPropertyDefinition({
    definition: {
      organizationId,
      name,
      description,
      type,
      displayOrder,
    },
  });

  if (options && options.length > 0 && isSelectLikePropertyType(type)) {
    await customPropertiesRepository.syncSelectOptions({
      propertyDefinitionId: propertyDefinition.id,
      options,
    });
  }

  return { propertyDefinition };
}

export async function updatePropertyDefinition({
  propertyDefinitionId,
  organizationId,
  name,
  description,
  displayOrder,
  options,
  customPropertiesRepository,
}: {
  propertyDefinitionId: string;
  organizationId: string;
  name?: string;
  description?: string | null;
  displayOrder?: number;
  options?: { id?: string; name: string }[];
  customPropertiesRepository: CustomPropertiesRepository;
}) {
  await ensurePropertyDefinitionExists({ propertyDefinitionId, organizationId, customPropertiesRepository });

  const { propertyDefinition } = await customPropertiesRepository.updatePropertyDefinition({
    propertyDefinitionId,
    organizationId,
    name,
    description,
    displayOrder,
  });

  if (options !== undefined && isSelectLikePropertyType(propertyDefinition?.type)) {
    await customPropertiesRepository.syncSelectOptions({
      propertyDefinitionId,
      options,
    });
  }

  return { propertyDefinition };
}

export async function deletePropertyDefinition({
  propertyDefinitionId,
  organizationId,
  customPropertiesRepository,
}: {
  propertyDefinitionId: string;
  organizationId: string;
  customPropertiesRepository: CustomPropertiesRepository;
}) {
  await ensurePropertyDefinitionExists({ propertyDefinitionId, organizationId, customPropertiesRepository });

  await customPropertiesRepository.deletePropertyDefinition({ propertyDefinitionId, organizationId });
}

export async function setDocumentCustomPropertyValue({
  documentId,
  propertyDefinitionId,
  organizationId,
  value,
  customPropertiesRepository,
}: {
  documentId: string;
  propertyDefinitionId: string;
  organizationId: string;
  value: unknown;
  customPropertiesRepository: CustomPropertiesRepository;
}) {
  const { definition } = await ensurePropertyDefinitionExists({ propertyDefinitionId, organizationId, customPropertiesRepository });

  const extractedValue = validateAndExtractPropertyValue({ type: definition.type, value });

  if ('selectOptionIds' in extractedValue) {
    const optionIds = extractedValue.selectOptionIds as string[];

    if (optionIds.length > 0) {
      await verifySelectOptionsExist({ propertyDefinitionId, optionIds, customPropertiesRepository, organizationId });
    }

    await customPropertiesRepository.setDocumentCustomPropertyValue({
      documentId,
      propertyDefinitionId,
      values: optionIds.map(selectOptionId => ({ selectOptionId })),
    });
  } else if ('selectOptionId' in extractedValue) {
    const selectOptionId = extractedValue.selectOptionId as string;
    await verifySelectOptionsExist({ propertyDefinitionId, optionIds: [selectOptionId], customPropertiesRepository, organizationId });

    await customPropertiesRepository.setDocumentCustomPropertyValue({
      documentId,
      propertyDefinitionId,
      values: [{ selectOptionId }],
    });
  } else {
    await customPropertiesRepository.setDocumentCustomPropertyValue({
      documentId,
      propertyDefinitionId,
      values: [extractedValue],
    });
  }
}

export async function deleteDocumentCustomPropertyValue({
  documentId,
  propertyDefinitionId,
  organizationId,
  customPropertiesRepository,
}: {
  documentId: string;
  propertyDefinitionId: string;
  organizationId: string;
  customPropertiesRepository: CustomPropertiesRepository;
}) {
  await ensurePropertyDefinitionExists({ propertyDefinitionId, organizationId, customPropertiesRepository });

  await customPropertiesRepository.deleteDocumentCustomPropertyValue({ documentId, propertyDefinitionId });
}

export async function ensurePropertyDefinitionExists({
  propertyDefinitionId,
  organizationId,
  customPropertiesRepository,
}: {
  propertyDefinitionId: string;
  organizationId: string;
  customPropertiesRepository: CustomPropertiesRepository;
}) {
  const { definition } = await customPropertiesRepository.getPropertyDefinitionById({ propertyDefinitionId, organizationId });

  if (!definition) {
    throw createCustomPropertyDefinitionNotFoundError();
  }

  return { definition };
}

async function verifySelectOptionsExist({
  propertyDefinitionId,
  optionIds,
  customPropertiesRepository,
  organizationId,
}: {
  propertyDefinitionId: string;
  optionIds: string[];
  customPropertiesRepository: CustomPropertiesRepository;
  organizationId: string;
}) {
  const { definition } = await customPropertiesRepository.getPropertyDefinitionById({ propertyDefinitionId, organizationId });

  if (!definition) {
    throw createCustomPropertyDefinitionNotFoundError();
  }

  const existingOptionIds = new Set(definition.options.map(o => o.id));

  for (const optionId of optionIds) {
    if (!existingOptionIds.has(optionId)) {
      throw createCustomPropertySelectOptionNotFoundError();
    }
  }
}
