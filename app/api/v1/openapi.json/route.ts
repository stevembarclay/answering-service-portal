import { NextResponse } from 'next/server'

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Answering Service Operator API',
    version: '1.0.0',
    description: 'REST API for operator and client integrations.',
  },
  servers: [{ url: '/api/v1' }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'API key issued via the operator portal. Include as: Authorization: Bearer <key>',
      },
    },
  },
  paths: {
    '/calls': {
      post: {
        summary: 'Ingest call log(s)',
        operationId: 'ingestCalls',
        description: 'Create one or more call log entries. Operator-scoped key with calls:write scope required.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  {
                    type: 'object',
                    description: 'Single call',
                    required: ['businessId', 'timestamp', 'message'],
                    properties: {
                      businessId: { type: 'string', format: 'uuid', description: 'Must belong to the operator org.' },
                      timestamp: { type: 'string', format: 'date-time', description: 'ISO 8601 call timestamp.' },
                      callerName: { type: 'string' },
                      callerNumber: { type: 'string' },
                      callbackNumber: { type: 'string' },
                      callType: {
                        type: 'string',
                        enum: ['urgent', 'new-client', 'appointment', 'general-info', 'after-hours'],
                      },
                      direction: { type: 'string', enum: ['inbound', 'outbound'] },
                      durationSeconds: { type: 'integer', minimum: 0 },
                      telephonyStatus: { type: 'string' },
                      message: { type: 'string', description: 'Call summary or transcript. Must be non-empty.' },
                      recordingUrl: { type: 'string', format: 'uri' },
                    },
                  },
                  {
                    type: 'array',
                    description: 'Batch of calls',
                    items: { type: 'object' },
                  },
                ],
              },
            },
          },
        },
        security: [{ bearerAuth: ['calls:write'] }],
        responses: {
          '201': { description: 'All calls ingested successfully' },
          '207': { description: 'Partial success — some rows had validation errors' },
          '400': { description: 'Invalid request body' },
          '401': { description: 'Unauthorized — missing or invalid bearer token' },
          '403': { description: 'Forbidden — business does not belong to operator org, or business-scoped key used' },
        },
      },
      get: {
        summary: 'List call logs',
        operationId: 'listCalls',
        parameters: [
          {
            name: 'business_id',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
            description: 'Required for operator keys. Filter by business.',
          },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25, maximum: 100 } },
        ],
        security: [{ bearerAuth: ['calls:read'] }],
        responses: {
          '200': { description: 'Paginated call list' },
          '400': { description: 'business_id required for operator key' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/calls/{id}': {
      get: {
        summary: 'Get a single call',
        operationId: 'getCall',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        security: [{ bearerAuth: ['calls:read'] }],
        responses: {
          '200': { description: 'Call with message actions' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/billing/estimate': {
      get: {
        summary: 'Current period billing estimate',
        operationId: 'getBillingEstimate',
        parameters: [
          {
            name: 'business_id',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
            description: 'Required for operator keys.',
          },
        ],
        security: [{ bearerAuth: ['billing:read'] }],
        responses: { '200': { description: 'BillingEstimate' } },
      },
    },
    '/billing/invoices': {
      get: {
        summary: 'Past invoices',
        operationId: 'listInvoices',
        parameters: [{ name: 'business_id', in: 'query', schema: { type: 'string', format: 'uuid' } }],
        security: [{ bearerAuth: ['billing:read'] }],
        responses: { '200': { description: 'Array of BillingInvoice' } },
      },
    },
    '/usage': {
      get: {
        summary: 'List usage periods',
        operationId: 'listUsagePeriods',
        security: [{ bearerAuth: ['billing:read'] }],
        responses: { '200': { description: 'Usage periods' } },
      },
      post: {
        summary: 'Ingest billing usage (operator key, usage:write scope)',
        operationId: 'ingestUsage',
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { file: { type: 'string', format: 'binary' } },
              },
            },
            'application/json': {
              schema: { type: 'array', items: { type: 'object' } },
            },
          },
        },
        security: [{ bearerAuth: ['usage:write'] }],
        responses: {
          '200': { description: 'All rows processed' },
          '207': { description: 'Some rows had errors' },
        },
      },
    },
    '/on-call/current': {
      get: {
        summary: 'Current on-call contact',
        operationId: 'getOnCallCurrent',
        description: 'Returns the active on-call escalation chain for the business at the time of the request.',
        parameters: [
          {
            name: 'business_id',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'The business to query. Required for operator keys.',
          },
        ],
        security: [{ bearerAuth: ['on_call:read'] }],
        responses: {
          '200': {
            description: 'Active on-call contact',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    escalationSteps: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          phone: { type: 'string' },
                          email: { type: 'string', format: 'email' },
                          delayMinutes: { type: 'integer' },
                        },
                      },
                    },
                    shiftName: { type: 'string' },
                    timezone: { type: 'string' },
                  },
                },
              },
            },
          },
          '404': { description: 'No active shift found for the current time' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/calls/{id}/recording': {
      post: {
        summary: 'Upload a call recording',
        operationId: 'uploadCallRecording',
        description: 'Attach an audio file to a call log. Accepts mp3, wav, or m4a up to 50 MB. Operator-scoped key with calls:write scope required.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Call log ID' },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary', description: 'Audio file (mp3, wav, or m4a). Max 50 MB.' },
                },
              },
            },
          },
        },
        security: [{ bearerAuth: ['calls:write'] }],
        responses: {
          '201': {
            description: 'Recording uploaded successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        callId: { type: 'string', format: 'uuid' },
                        storagePath: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { description: 'Missing file, unsupported format, or file too large' },
          '403': { description: 'Call does not belong to your operator org, or business-scoped key used' },
          '404': { description: 'Call not found' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/webhooks': {
      get: {
        summary: 'List webhook subscriptions',
        operationId: 'listWebhooks',
        security: [{ bearerAuth: ['webhooks:read'] }],
        responses: { '200': { description: 'Subscription list (secret excluded)' } },
      },
      post: {
        summary: 'Create webhook subscription',
        operationId: 'createWebhook',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url', 'topics'],
                properties: {
                  url: { type: 'string', format: 'uri' },
                  topics: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        security: [{ bearerAuth: ['webhooks:write'] }],
        responses: { '201': { description: 'Subscription created — secret returned once' } },
      },
    },
    '/webhooks/{id}': {
      delete: {
        summary: 'Delete webhook subscription',
        operationId: 'deleteWebhook',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        security: [{ bearerAuth: ['webhooks:write'] }],
        responses: { '204': { description: 'Deleted' } },
      },
    },
  },
}

export async function GET() {
  return NextResponse.json(spec, {
    headers: { 'Content-Type': 'application/json' },
  })
}
