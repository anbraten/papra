import type { RouteDefinitionContext } from '../app/server.types';
import type { CustomPropertyType } from './custom-properties.constants';
import { z } from 'zod';
import { API_KEY_PERMISSIONS } from '../api-keys/api-keys.constants';
import { requireAuthentication } from '../app/auth/auth.middleware';
import { getUser } from '../app/auth/auth.models';
import { createDocumentNotFoundError } from '../documents/documents.errors';
import { createDocumentsRepository } from '../documents/documents.repository';
import { documentIdSchema } from '../documents/documents.schemas';
import { organizationIdSchema } from '../organizations/organization.schemas';
import { createOrganizationsRepository } from '../organizations/organizations.repository';
import { ensureUserIsInOrganization } from '../organizations/organizations.usecases';
import { validateJsonBody, validateParams } from '../shared/validation/validation';
import { aggregateDocumentCustomPropertyValues } from './custom-properties.models';
import { createCustomPropertiesRepository } from './custom-properties.repository';
import { customPropertyDefinitionIdSchema, customPropertyTypeSchema } from './custom-properties.schemas';
import { createPropertyDefinition, deleteDocumentCustomPropertyValue, deletePropertyDefinition, ensurePropertyDefinitionExists, setDocumentCustomPropertyValue, updatePropertyDefinition } from './custom-properties.usecases';

export function registerCustomPropertiesRoutes(context: RouteDefinitionContext) {
  setupCreatePropertyDefinitionRoute(context);
  setupGetOrganizationPropertyDefinitionsRoute(context);
  setupGetPropertyDefinitionRoute(context);
  setupUpdatePropertyDefinitionRoute(context);
  setupDeletePropertyDefinitionRoute(context);

  setupSetDocumentCustomPropertyValueRoute(context);
  setupDeleteDocumentCustomPropertyValueRoute(context);
  setupGetDocumentCustomPropertyValuesRoute(context);
}

function setupCreatePropertyDefinitionRoute({ app, db, config }: RouteDefinitionContext) {
  app.post(
    '/api/organizations/:organizationId/custom-properties',
    requireAuthentication(),
    validateParams(z.object({
      organizationId: organizationIdSchema,
    })),
    validateJsonBody(
      z.object({
        name: z.string().trim().min(1).max(255),
        description: z.string().trim().max(1000).optional(),
        type: customPropertyTypeSchema,
        displayOrder: z.number().int().min(0).optional(),
        options: z.array(z.object({
          name: z.string().trim().min(1).max(255),
        })).optional(),
      }).refine((data) => {
        if (data.type === 'select' || data.type === 'multi_select') {
          return data.options !== undefined && data.options.length > 0;
        } else {
          return data.options === undefined;
        }
      }, { message: 'Options are required for select and multi_select types, and must not be provided for other types' }),
    ),
    async (context) => {
      const { userId } = getUser({ context });
      const { organizationId } = context.req.valid('param');
      const { name, description, type, displayOrder, options } = context.req.valid('json');

      const customPropertiesRepository = createCustomPropertiesRepository({ db });
      const organizationsRepository = createOrganizationsRepository({ db });

      await ensureUserIsInOrganization({ userId, organizationId, organizationsRepository });

      const { propertyDefinition } = await createPropertyDefinition({
        organizationId,
        name,
        description,
        type: type as CustomPropertyType,
        displayOrder,
        options,
        config,
        customPropertiesRepository,
      });

      return context.json({ propertyDefinition });
    },
  );
}

function setupGetOrganizationPropertyDefinitionsRoute({ app, db }: RouteDefinitionContext) {
  app.get(
    '/api/organizations/:organizationId/custom-properties',
    requireAuthentication(),
    validateParams(z.object({
      organizationId: organizationIdSchema,
    })),
    async (context) => {
      const { userId } = getUser({ context });
      const { organizationId } = context.req.valid('param');

      const customPropertiesRepository = createCustomPropertiesRepository({ db });
      const organizationsRepository = createOrganizationsRepository({ db });

      await ensureUserIsInOrganization({ userId, organizationId, organizationsRepository });

      const { propertyDefinitions } = await customPropertiesRepository.getOrganizationPropertyDefinitions({ organizationId });

      return context.json({ propertyDefinitions });
    },
  );
}

function setupGetPropertyDefinitionRoute({ app, db }: RouteDefinitionContext) {
  app.get(
    '/api/organizations/:organizationId/custom-properties/:propertyDefinitionId',
    requireAuthentication(),
    validateParams(z.object({
      organizationId: organizationIdSchema,
      propertyDefinitionId: customPropertyDefinitionIdSchema,
    })),
    async (context) => {
      const { userId } = getUser({ context });
      const { organizationId, propertyDefinitionId } = context.req.valid('param');

      const customPropertiesRepository = createCustomPropertiesRepository({ db });
      const organizationsRepository = createOrganizationsRepository({ db });

      await ensureUserIsInOrganization({ userId, organizationId, organizationsRepository });

      const { definition } = await ensurePropertyDefinitionExists({
        propertyDefinitionId,
        organizationId,
        customPropertiesRepository,
      });

      return context.json({ definition });
    },
  );
}

function setupUpdatePropertyDefinitionRoute({ app, db }: RouteDefinitionContext) {
  app.put(
    '/api/organizations/:organizationId/custom-properties/:propertyDefinitionId',
    requireAuthentication(),
    validateParams(z.object({
      organizationId: organizationIdSchema,
      propertyDefinitionId: customPropertyDefinitionIdSchema,
    })),
    validateJsonBody(
      z.object({
        name: z.string().trim().min(1).max(255).optional(),
        description: z.string().trim().max(1000).optional(),
        displayOrder: z.number().int().min(0).optional(),
        options: z.array(z.object({
          id: z.string().optional(),
          name: z.string().trim().min(1).max(255),
        })).optional(),
      }),
    ),
    async (context) => {
      const { userId } = getUser({ context });
      const { organizationId, propertyDefinitionId } = context.req.valid('param');
      const { name, description, displayOrder, options } = context.req.valid('json');

      const customPropertiesRepository = createCustomPropertiesRepository({ db });
      const organizationsRepository = createOrganizationsRepository({ db });

      await ensureUserIsInOrganization({ userId, organizationId, organizationsRepository });

      const { propertyDefinition } = await updatePropertyDefinition({
        propertyDefinitionId,
        organizationId,
        name,
        description,
        displayOrder,
        options,
        customPropertiesRepository,
      });

      return context.json({ propertyDefinition });
    },
  );
}

function setupDeletePropertyDefinitionRoute({ app, db }: RouteDefinitionContext) {
  app.delete(
    '/api/organizations/:organizationId/custom-properties/:propertyDefinitionId',
    requireAuthentication(),
    validateParams(z.object({
      organizationId: organizationIdSchema,
      propertyDefinitionId: customPropertyDefinitionIdSchema,
    })),
    async (context) => {
      const { userId } = getUser({ context });
      const { organizationId, propertyDefinitionId } = context.req.valid('param');

      const customPropertiesRepository = createCustomPropertiesRepository({ db });
      const organizationsRepository = createOrganizationsRepository({ db });

      await ensureUserIsInOrganization({ userId, organizationId, organizationsRepository });

      await deletePropertyDefinition({
        propertyDefinitionId,
        organizationId,
        customPropertiesRepository,
      });

      return context.json({});
    },
  );
}

function setupSetDocumentCustomPropertyValueRoute({ app, db }: RouteDefinitionContext) {
  app.put(
    '/api/organizations/:organizationId/documents/:documentId/custom-properties/:propertyDefinitionId',
    requireAuthentication({ apiKeyPermissions: [API_KEY_PERMISSIONS.DOCUMENTS.UPDATE] }),
    validateParams(z.object({
      organizationId: organizationIdSchema,
      documentId: documentIdSchema,
      propertyDefinitionId: customPropertyDefinitionIdSchema,
    })),
    validateJsonBody(z.object({
      value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
    })),
    async (context) => {
      const { userId } = getUser({ context });
      const { organizationId, documentId, propertyDefinitionId } = context.req.valid('param');
      const { value } = context.req.valid('json');

      const customPropertiesRepository = createCustomPropertiesRepository({ db });
      const organizationsRepository = createOrganizationsRepository({ db });
      const documentsRepository = createDocumentsRepository({ db });

      await ensureUserIsInOrganization({ userId, organizationId, organizationsRepository });

      const { document } = await documentsRepository.getDocumentById({ documentId, organizationId });

      if (!document) {
        throw createDocumentNotFoundError();
      }

      await setDocumentCustomPropertyValue({
        documentId,
        propertyDefinitionId,
        organizationId,
        value,
        customPropertiesRepository,
      });

      return context.body(null, 204);
    },
  );
}

function setupDeleteDocumentCustomPropertyValueRoute({ app, db }: RouteDefinitionContext) {
  app.delete(
    '/api/organizations/:organizationId/documents/:documentId/custom-properties/:propertyDefinitionId',
    requireAuthentication({ apiKeyPermissions: [API_KEY_PERMISSIONS.DOCUMENTS.UPDATE] }),
    validateParams(z.object({
      organizationId: organizationIdSchema,
      documentId: documentIdSchema,
      propertyDefinitionId: customPropertyDefinitionIdSchema,
    })),
    async (context) => {
      const { userId } = getUser({ context });
      const { organizationId, documentId, propertyDefinitionId } = context.req.valid('param');

      const customPropertiesRepository = createCustomPropertiesRepository({ db });
      const organizationsRepository = createOrganizationsRepository({ db });
      const documentsRepository = createDocumentsRepository({ db });

      await ensureUserIsInOrganization({ userId, organizationId, organizationsRepository });

      const { document } = await documentsRepository.getDocumentById({ documentId, organizationId });

      if (!document) {
        throw createDocumentNotFoundError();
      }

      await deleteDocumentCustomPropertyValue({
        documentId,
        propertyDefinitionId,
        organizationId,
        customPropertiesRepository,
      });

      return context.body(null, 204);
    },
  );
}

function setupGetDocumentCustomPropertyValuesRoute({ app, db }: RouteDefinitionContext) {
  app.get(
    '/api/organizations/:organizationId/documents/:documentId/custom-properties',
    requireAuthentication({ apiKeyPermissions: [API_KEY_PERMISSIONS.DOCUMENTS.READ] }),
    validateParams(z.object({
      organizationId: organizationIdSchema,
      documentId: documentIdSchema,
    })),
    async (context) => {
      const { userId } = getUser({ context });
      const { organizationId, documentId } = context.req.valid('param');

      const customPropertiesRepository = createCustomPropertiesRepository({ db });
      const organizationsRepository = createOrganizationsRepository({ db });
      const documentsRepository = createDocumentsRepository({ db });

      await ensureUserIsInOrganization({ userId, organizationId, organizationsRepository });

      const { document } = await documentsRepository.getDocumentById({ documentId, organizationId });

      if (!document) {
        throw createDocumentNotFoundError();
      }

      const { values } = await customPropertiesRepository.getDocumentCustomPropertyValues({ documentId });

      const customProperties = aggregateDocumentCustomPropertyValues({ rawValues: values });

      return context.json({ customProperties });
    },
  );
}
