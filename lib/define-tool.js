/** Minimal registry-ready tool definition helper (no Harness package import). */

function parameterSchema(spec) {
  if (!spec || typeof spec !== 'object') return {};
  const schema = {};
  if (typeof spec.description === 'string' && spec.description !== '') schema.description = spec.description;
  if (spec.type === 'json') return schema;
  if (spec.type === 'array') {
    schema.type = 'array';
    if (spec.items) schema.items = parameterSchema(spec.items);
    return schema;
  }
  if (spec.type === 'object') {
    schema.type = 'object';
    schema.properties = {};
    const required = [];
    for (const [key, child] of Object.entries(spec.properties ?? {})) {
      schema.properties[key] = parameterSchema(child);
      if (child?.required === true) required.push(key);
    }
    if (required.length > 0) schema.required = required;
    schema.additionalProperties = false;
    return schema;
  }
  schema.type = spec.type;
  if (Array.isArray(spec.enum)) schema.enum = spec.enum;
  if (spec.const !== undefined) schema.const = spec.const;
  return schema;
}

function parameterObject(specs = {}) {
  const properties = {};
  const required = [];
  for (const [key, spec] of Object.entries(specs)) {
    properties[key] = parameterSchema(spec);
    if (spec?.required === true) required.push(key);
  }
  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
    additionalProperties: false,
  };
}

/**
 * Build a ToolDefinition from the same small DSL used by dsh-tools.
 * @param {object} options
 */
export function defineTool(options) {
  if (options.timeoutMs !== undefined && (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)) {
    throw new Error(`defineTool(${options.name}): timeoutMs must be a positive finite number`);
  }
  const render = options.output?.render ?? ((_args, value) => [{ type: 'text', text: String(value ?? '') }]);
  return {
    name: options.name,
    description: options.description,
    parameters: parameterObject(options.parameters),
    output: {
      schema: parameterSchema(options.output?.schema ?? { type: 'string' }),
      render(args, value) {
        return render(args, value);
      },
    },
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    ...(options.isConcurrencySafe === undefined ? {} : { isConcurrencySafe: options.isConcurrencySafe }),
    execute: options.execute,
  };
}
