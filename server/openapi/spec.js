module.exports = {
  openapi: "3.0.0",
  info: {
    title: "4thBrain Data API",
    version: "1.0.0",
    description: "Unified REST API for 4thBrain SQLite metadata database",
  },
  servers: [{ url: "http://localhost:3000", description: "Development" }],
  paths: {
    "/api/tables/{table}": {
      get: {
        operationId: "listTable",
        summary: "List all rows in a table",
        parameters: [{ name: "table", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "List of rows", content: { "application/json": { schema: { type: "array" } } } },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      post: {
        operationId: "createRow",
        summary: "Create a new row in a table",
        parameters: [{ name: "table", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: {
          201: { description: "Row created", content: { "application/json": { schema: { type: "object" } } } },
          400: { $ref: "#/components/responses/BadRequest" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/tables/{table}/{key}": {
      get: {
        operationId: "getRow",
        summary: "Get a single row by key",
        parameters: [
          { name: "table", in: "path", required: true, schema: { type: "string" } },
          { name: "key", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Row found", content: { "application/json": { schema: { type: "object" } } } },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        operationId: "updateRow",
        summary: "Update a row by key",
        parameters: [
          { name: "table", in: "path", required: true, schema: { type: "string" } },
          { name: "key", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: {
          200: { description: "Row updated", content: { "application/json": { schema: { type: "object" } } } },
          400: { $ref: "#/components/responses/BadRequest" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        operationId: "deleteRow",
        summary: "Delete a row by key",
        parameters: [
          { name: "table", in: "path", required: true, schema: { type: "string" } },
          { name: "key", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          204: { description: "Row deleted" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/tables/document/{id}/tags": {
      get: {
        operationId: "listDocumentTags",
        summary: "List tags for a document",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "List of tag names", content: { "application/json": { schema: { type: "array", items: { type: "string" } } } } },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      post: {
        operationId: "linkDocumentTag",
        summary: "Link a tag to a document",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { tag_name: { type: "string" } } } } } },
        responses: {
          201: { description: "Tag linked" },
          400: { $ref: "#/components/responses/BadRequest" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/tables/document/{id}/tags/{tagName}": {
      delete: {
        operationId: "unlinkDocumentTag",
        summary: "Unlink a tag from a document",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
          { name: "tagName", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          204: { description: "Tag unlinked" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
  },
  components: {
    responses: {
      BadRequest: { description: "Bad request", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      NotFound: { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      Forbidden: { description: "Forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
    },
    schemas: {
      Error: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
    },
  },
};
