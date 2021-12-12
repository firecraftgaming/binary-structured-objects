import { ArrayType, buildDataSchema, buildSchema, constructSchema, RefType, SchemaType, Type, TypeConstruct } from "./api";
import { BinaryTranslation, Schema } from "./binary";

export interface BinaryStructuredObjectsTypes {
  [key: string]: Type;
}
export interface BinaryStructuredObjectsSchemas {
  [key: string]: Schema;
}

export class BinaryStructuredObjectsSchema {
  private types: BinaryStructuredObjectsTypes;
  private schemas: BinaryStructuredObjectsSchemas;

  constructor(schema: string);
  constructor(types: BinaryStructuredObjectsTypes, schemas: BinaryStructuredObjectsSchemas);

  constructor(schema: string | BinaryStructuredObjectsTypes, schemas: BinaryStructuredObjectsSchemas = {}) {
    if (typeof schema === 'string') {
      this.parse(schema);
    } else {
      this.types = schema;
      this.schemas = schemas;
    }
  }

  private throwError(error: string, line: number, column: number) {
    throw new Error(`Syntax Error in Schema, ${error} at: ${line + 1}:${column + 1}`);
  }

  private throwUnexpectedToken(line: number, column: number) {
    this.throwError('found unexpected token', line, column);
  }
  private throwUnexpectedEOL(line: number, column: number) {
    this.throwError('unexpected end of line', line, column);
  }

  private parseInterface(line: number, lines: string[]): [SchemaType, number] {
    const data: SchemaType = {
      kind: 'schema',
      type: {

      }
    };

    const regex = new RegExp('(?:[^\\s\\w])|(?:[^\\s\\W]+)', 'g');

    let l = line;

    main:
    for (let i = line; i < lines.length; i++) {
      const line = lines[i];
      const tokens = line.matchAll(regex);

      l = i;

      for (const token of tokens) {
        const value = token[0];

        if (value === '/') {
          const next = tokens.next();
          if (next.value[0] !== '/') this.throwUnexpectedToken(i, token.index);
          break;
        }

        if (value === '}') {
          break main;
        }

        let optional = false;

        let next = tokens.next();
        if (next.done) this.throwUnexpectedEOL(i, line.length - 1);

        if (next.value[0] === '?') {
          optional = true;
          next = tokens.next();
          if (next.done) this.throwUnexpectedEOL(i, line.length - 1);
        }

        if (next.value[0] === '{') {
          const [inner_data, line] = this.parseInterface(i, lines);
          i = line - 1;
          data.type[value] = {
            type: inner_data,
            optional
          };
          continue main;
        } else {
          let arrayDepth = 0;
          while (next.value[0] === '[') {
            arrayDepth++;
            next = tokens.next();
            if (next.done) this.throwUnexpectedEOL(i, lines[i].length - 1);
            if (next.value[0] !== ']') this.throwUnexpectedToken(i, next.value.index);
            
            next = tokens.next();
            if (next.done) this.throwUnexpectedEOL(i, lines[i].length - 1);
          }

          let typeData: Type = {
            kind: 'ref',
            type: next.value[0]
          } as RefType;
          for (let i = 0; i < arrayDepth; i++) {
            typeData = {
              kind: 'array',
              type: typeData
            } as ArrayType;
          }

          data.type[value] = {
            type: typeData,
            optional
          };

          const last = tokens.next();
          if (!last.done) this.throwUnexpectedToken(i, last.value.index);
        }
      }
    }

    return [data, l + 1];
  }

  private parseType(tokens: IterableIterator<RegExpMatchArray>, line: number, lines: string[]): [number, number] {
    let token: IteratorResult<RegExpMatchArray, undefined>
    
    token = tokens.next();
    if (token.done) this.throwUnexpectedEOL(line, lines[line].length - 1);
    
    const name = token.value[0];

    const next = tokens.next();
    if (next.done) this.throwUnexpectedEOL(line, lines[line].length - 1);

    let nextValue = next.value[0];
    if (nextValue !== '{') {
      let arrayDepth = 0;
      while (nextValue === '[') {
        arrayDepth++;
        token = tokens.next();
        if (token.done) this.throwUnexpectedEOL(line, lines[line].length - 1);
        if (token.value[0] !== ']') this.throwUnexpectedToken(line, token.value.index);
        
        token = tokens.next();
        if (token.done) this.throwUnexpectedEOL(line, lines[line].length - 1);

        nextValue = token.value[0];
      }

      let typeData: Type = {
        kind: 'ref',
        type: nextValue
      } as RefType;
      for (let i = 0; i < arrayDepth; i++) {
        typeData = {
          kind: 'array',
          type: typeData
        } as ArrayType;
      }

      this.types[name] = typeData;

      const last = tokens.next();
      if (last.done) return [line + 1, 0];
      
      return [line, last.value.index];
    }
    
    const last = tokens.next();
    if (!last.done) this.throwUnexpectedToken(line, last.value.index);

    const [data, l] = this.parseInterface(line + 1, lines);
    this.types[name] = data;

    return [l, 0];
  }

  private parse(schema: string) {
    this.types = {};
    this.schemas = {};

    const regex = new RegExp('(?:[^\\s\\w])|(?:[^\\s\\W]+)', 'g');
    const lines = schema.split('\n');

    let col = 0;

    main:
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const tokens = line.matchAll(regex);

      for (const token of tokens) {
        const value = token[0];
        if (token.index < col) continue;

        if (value === '/') {
          const next = tokens.next();
          if (next.value[0] !== '/') this.throwUnexpectedToken(i, token.index);
          break;
        }

        if (value === 'type') {
          const [line, column] = this.parseType(tokens, i, lines);
          i = line - 1;
          col = column;
          continue main;
        }

        if (value === 'schema') {
          const next = tokens.next();
          if (next.done) this.throwUnexpectedEOL(i, line.length - 1);

          const name = next.value[0];
          if (!this.types[name]) this.throwError(`Type ${name} does not exist`, i, token.index);
          if (this.types[name].kind !== 'schema') this.throwError(`Type ${name} is not a schema`, i, token.index);

          this.schemas[name] = buildSchema(this.types, this.types[name] as SchemaType);
          continue main;
        }

        this.throwUnexpectedToken(i, token.index);
      }

      col = 0;
    }
  }

  public setConstructor(name: string, constructor: (data: TypeConstruct) => any) {
    const type = this.types[name];
    if (!type) throw new Error(`Type ${name} does not exist`);
    if (type.kind !== 'schema') throw new Error(`Type ${name} is not a schema`);

    (type as SchemaType).construct = constructor;
  }

  public encode(name: string, data: any): Uint8Array {
    const type = this.types[name];
    if (!type) throw new Error(`Type ${name} does not exist`);
    if (type.kind !== 'schema') throw new Error(`Type ${name} is not a schema`);

    const schema = this.schemas[name];
    if (!schema) throw new Error(`Schema ${name} does not exist`);

    const intermediate = buildDataSchema(this.types, type as SchemaType, data);
    const binary = BinaryTranslation.build(intermediate, schema);

    return binary;
  }

  public decode(name: string, data: Uint8Array): any {
    const type = this.types[name];
    if (!type) throw new Error(`Type ${name} does not exist`);
    if (type.kind !== 'schema') throw new Error(`Type ${name} is not a schema`);

    const schema = this.schemas[name];
    if (!schema) throw new Error(`Schema ${name} does not exist`);

    const intermediate = BinaryTranslation.parse(data, schema);
    const result = constructSchema(this.types, type as SchemaType, intermediate);

    return result;
  }
}