import { Result, Schema, SchemaArray, SchemaBasicType, SchemaType as AnySchema } from "index";
import { BinaryStructuredObjectsSchema } from "schema";

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

function buildType(types: BinaryStructuredObjectsSchema['types'], type: Type): AnySchema {
  switch (type.kind) {
    case 'ref':
      const refType = types[type.type];
      if (!refType) return {
        type: type.type
      } as SchemaBasicType;

      return buildType(types, refType);
    case 'array':
      const arrayType = buildType(types, type.type);
      return {
        type: 'array',
        value: arrayType,
      } as SchemaArray;
    case 'schema':
      return buildSchema(types, type);
  }
}

export function buildSchema(types: BinaryStructuredObjectsSchema['types'], type: SchemaType): Schema {
  const required = [];
  const optionals = [];
  const keys = Object.keys(type.type);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const type_data = type.type[key];

    const inner_type = buildType(types, type_data.type);
    if (type_data.optional) optionals.push(inner_type); else required.push(inner_type);
  }

  const schema: Schema = {
    type: 'schema',

    required,
    optionals,
  };

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
export function buildDataSchema(types: BinaryStructuredObjectsSchema['types'], type: SchemaType, data: Schema): Array<Result> {
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

// function defaultSchema(): BinaryStructuredObjectsSchema {
//   const types: BinaryStructuredObjectsSchema['types'] = {
//     ID: {
//       kind: 'alias',
//       type: 'string',
//     },
//     Presentation: {
//       kind: 'schema',
//       type: {
//         id: {
//           type: {
//             kind: 'ref',
//             type: 'ID',
//           },
//           optional: false,
//         }
//       },
//     },
//     Library: {
//       kind: 'schema',
//       type: {
//         id: {
//           type: {
//             kind: 'ref',
//             type: 'ID',
//           },
//           optional: false,
//         },
//         name: {
//           type: {
//             kind: 'ref',
//             type: 'string',
//           },
//           optional: false,
//         },
//         presentations: {
//           type: {
//             kind: 'array',
//             type: {
//               kind: 'ref',
//               type: 'Presentation',
//             },
//           },
//           optional: false,
//         },
//       },
//     }
//   };

//   return new BinaryStructuredObjectsSchema(types, {
//     Library: buildSchema(types, types.Library as SchemaType),
//   });
// }

export {};