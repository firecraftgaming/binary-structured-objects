import { Result, Schema, SchemaArray, SchemaBasicType, SchemaType as AnySchema } from "./binary";
import { BinaryStructuredObjectsSchema } from "./schema";

export interface RefType {
  kind: 'ref';
  type: string;
}
export interface ArrayType {
  kind: 'array';
  type: Type;
}
export interface SchemaType {
  kind: 'schema';
  type: {
    [key: string]: {
      type: Type;
      optional: boolean;
    };
  };

  construct?: (type: TypeConstruct) => any;
}

export type Type = RefType | ArrayType | SchemaType;

export interface TypeConstruct {
  [key: string]: any;
}

function construct(types: BinaryStructuredObjectsSchema['types'], type: Type, value: Result): any {
  switch (type.kind) {
    case 'ref':
      const refType = types[type.type];
      if (!refType) return value;

      return construct(types, refType, value);
    case 'array':
      return (value as Array<Result>).map(item => construct(types, type.type, item));
    case 'schema': {
      return constructSchema(types, type, value);
    }
  }
}

export function constructSchema(types: BinaryStructuredObjectsSchema['types'], type: SchemaType, value: Result): any {
  const data = {};
  const keys = Object.keys(type.type);

  let index = 0;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const type_data = type.type[key];
    
    const inner_type = type_data.type;
    if (type_data.optional) continue;

    data[key] = construct(types, inner_type, (value as Array<Result>)[index]);
    index++;
  }
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const type_data = type.type[key];
    
    const inner_type = type_data.type;
    if (!type_data.optional) continue;

    const inner_data = (value as Array<Result>)[index];
    if (inner_data) data[key] = construct(types, inner_type, inner_data);
    
    index++;
  }

  const constructor = type.construct;
  if (!constructor) return data;

  return constructor(data);
}

function buildType(types: BinaryStructuredObjectsSchema['types'], type: Type, cached = new Map<string, AnySchema>(), name?: string): AnySchema {
  switch (type.kind) {
    case 'ref': {
      const refType = types[type.type];
      if (!refType) return {
        type: type.type
      } as SchemaBasicType;

      if (name && cached.has(name)) return cached.get(name);

      const result = buildType(types, refType, cached, type.type);
      if (name) cached.set(name, result);

      return result;
    }
    case 'array': {
      if (name && cached.has(name)) return cached.get(name);
      
      const arrayType = buildType(types, type.type, cached);
      const result = {
        type: 'array',
        value: arrayType,
      } as SchemaArray;
      
      if (name) cached.set(name, result);
      return result;
    }
    case 'schema':
      if (name && cached.has(name)) return cached.get(name);
      return buildSchema(types, type, cached, name);
  }
}

export function buildSchema(types: BinaryStructuredObjectsSchema['types'], type: SchemaType, cached = new Map<string, AnySchema>(), name?: string): Schema {
  const schema: Schema = {
    type: 'schema',

    required: [],
    optionals: [],
  };

  if (name) cached.set(name, schema);

  const keys = Object.keys(type.type);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const type_data = type.type[key];

    const inner_type = buildType(types, type_data.type, cached);
    if (type_data.optional) schema.optionals.push(inner_type); else schema.required.push(inner_type);
  }

  return schema;
}

function buildData(types: BinaryStructuredObjectsSchema['types'], type: Type, data: any): Result {
  switch (type.kind) {
    case 'ref':
      const refType = types[type.type];
      if (!refType) return data;

      return buildData(types, refType, data);
    case 'array':
      return (data as Array<any>).map(item => buildData(types, type.type, item));
    case 'schema':
      return buildDataSchema(types, type, data);
  }
}
export function buildDataSchema(types: BinaryStructuredObjectsSchema['types'], type: SchemaType, data: any): Array<Result> {
  if ('serialize' in data) return buildDataSchema(types, type, data.serialize());

  const required = [];
  const optionals = [];
  const keys = Object.keys(type.type);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const type_data = type.type[key];

    let inner_data = (data[key] && buildData(types, type_data.type, data[key])) ?? null;
    if (type_data.optional) optionals.push(inner_data); else required.push(inner_data);
  }

  return required.concat(optionals);
}