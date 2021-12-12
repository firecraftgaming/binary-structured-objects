export type SchemaString = {
  type: 'string';
};
export type SchemaNumber = {
  type: 'number';
};
export type SchemaBoolean = {
  type: 'boolean';
};
export type SchemaTuple = {
  type: 'tuple';

  values: Array<SchemaType>;
};
export type SchemaArray = {
  type: 'array';

  value: SchemaType;
};
export type Schema = {
  type: 'schema';
  
  required: Array<SchemaType>;
  optionals: Array<SchemaType>;
};

export type BasicResult = string | number | boolean;
export type Result = BasicResult | Array<Result>;
export type SchemaBasicType = SchemaString | SchemaNumber | SchemaBoolean;
export type SchemaType = SchemaBasicType | SchemaTuple | SchemaArray | Schema;

export const string = (): SchemaString => ({
  type: 'string',
});
export const tuple = (...values: Array<SchemaType>): SchemaTuple => ({
  type: 'tuple',
  values,
});
export const array = (value: SchemaType): SchemaArray => ({
  type: 'array',
  value,
});
export const schema = (required?: Array<SchemaType>, optionals?: Array<SchemaType>): Schema => ({
  type: 'schema',

  required: required ?? [],
  optionals: optionals ?? [],
});

export class BinaryTranslation {
  static build(input: Result[], schema: Schema): Uint8Array {
    const result = this.buildSchema(input, schema);
    return result;
  }

  static buildType(type: SchemaType, value: Result): Uint8Array {
    switch (type.type) {
      case 'string':
        if (typeof value !== 'string') throw new Error('string value is not string');
        return this.buildString(value, type);
      case 'number':
        if (typeof value !== 'number') throw new Error('number value is not number');
        return this.buildNumber(value);
      case 'boolean':
        if (typeof value !== 'boolean') throw new Error('boolean value is not boolean');
        return this.buildBoolean(value);

      case 'tuple':
        if (!Array.isArray(value)) throw new Error('tuple value is not array');
        return this.buildTuple(value, type);
      case 'array':
        if (!Array.isArray(value)) throw new Error('array value is not array');
        return this.buildArray(value, type);
      case 'schema':
        if (!Array.isArray(value)) throw new Error('schema value is not array');
        return this.buildSchema(value, type);
    }
  }

  static buildBoolean(value: boolean): Uint8Array {
    return new Uint8Array([value ? 1 : 0]);
  }

  static buildNumber(value: number): Uint8Array {
    let length = 1;

    {
      let v = value;
      while (v > 0x7f) {
        length++;
        v >>= 7;
      }
    }

    let bytes = new Uint8Array(length);
    let i = 0;

    while (value > 0x7f) {
      bytes[i++] = (value & 0x7f) | 0x80;
      value = value >> 7;
    }

    bytes[i++] = value;
    return bytes;
  }

  static buildString(str: string, _structure: SchemaString): Uint8Array {
    const string = this.stringToBinary(str);
    const number = this.buildNumber(string.length);

    const bytes = new Uint8Array(string.length + number.length);
    bytes.set(number, 0);
    bytes.set(string, number.length);

    return bytes;
  }

  static buildTuple(values: Array<Result>, structure: SchemaTuple): Uint8Array {
    let results: Array<Uint8Array> = [];
    let length = 0;

    for (let i = 0; i < structure.values.length; i++) {
      const value = values[i];
      const type = structure.values[i];
      
      const bytes = this.buildType(type, values[i]);
      results.push(bytes);
      length += bytes.length;
    }

    const bytes = new Uint8Array(length);

    let pos = 0;
    for (let i = 0; i < results.length; i++) {
      bytes.set(results[i], pos);
      pos += results[i].length;
    }

    return bytes;
  }
  static buildArray<T extends Result>(values: Array<T>, structure: SchemaArray): Uint8Array {
    const number = this.buildNumber(values.length);
    let results: Array<Uint8Array> = [ number ];
    let length = number.length

    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      const type = structure.value;
      
      const bytes = this.buildType(type, values[i]);
      results.push(bytes);
      length += bytes.length;
    }

    const bytes = new Uint8Array(length);

    let pos = 0;
    for (let i = 0; i < results.length; i++) {
      bytes.set(results[i], pos);
      pos += results[i].length;
    }

    return bytes;
  }
  static buildSchema(values: Array<Result>, structure: Schema): Uint8Array {
    const required: Array<Uint8Array> = [];
    const optionals: Array<Uint8Array> = [];
    let length = 0;

    for (let i = 0; i < structure.required.length; i++) {
      const value = values[i];
      const type = structure.required[i];
      
      const bytes = this.buildType(type, value);
      required.push(bytes);
      length += bytes.length;
    }

    let optional = 0;
    // TODO: optional integer can only go to 2 ^ 32 which means there are only 32 optional values allowed within the bit mask, this should be changed to a bit array

    for (let i = 0; i < structure.optionals.length; i++) {
      const value = values[i + structure.required.length];
      const type = structure.optionals[i];   
      
      if (value !== null) {
        const bytes = this.buildType(type, value);
        optionals.push(bytes);
        length += bytes.length;

        optional |= 1 << i;
      }
    }
    
    const optional_bytes = this.buildNumber(optional);
    length += optional_bytes.length;

    const bytes = new Uint8Array(length);

    let index = 0;
    for (let i = 0; i < required.length; i++) {
      bytes.set(required[i], index);
      index += required[i].length;
    }

    bytes.set(optional_bytes, index);
    index += optional_bytes.length;

    for (let i = 0; i < optionals.length; i++) {
      bytes.set(optionals[i], index);
      index += optionals[i].length;
    }

    return bytes;
  }

  static parse(bytes: Uint8Array, schema: Schema): Result[] {
    const [result, _] = this.parseSchema(bytes, 0, schema);
    return result;
  }

  static parseType(bytes: Uint8Array, pos: number, type: SchemaType): [Result, number] {
    switch (type.type) {
      case 'string':
        return this.parseString(bytes, pos);
      case 'number':
        return this.parseNumber(bytes, pos);
      case 'boolean':
        return this.parseBoolean(bytes, pos);

      case 'tuple':
        return this.parseTuple(bytes, pos, type);
      case 'array':
        return this.parseArray(bytes, pos, type);
      case 'schema':
        return this.parseSchema(bytes, pos, type);
    }
  }

  static parseBoolean(bytes: Uint8Array, pos: number): [boolean, number] {
    if (bytes[pos] === 0) return [false, pos + 1];
    if (bytes[pos] === 1) return [true, pos + 1];
    throw new Error('invalid boolean');
  }

  static parseNumber(bytes: Uint8Array, pos: number): [number, number] {
    let value = bytes[pos] & 0x7f;
    let i = 0;

    while (bytes[pos + i] > 0x7f) {
      i++;
      value |= (bytes[pos + i] & 0x7f) << (7 * i);
    }

    return [value, pos + i + 1];
  }

  static parseString(bytes: Uint8Array, pos: number): [Result, number] {
    let length: number;
    [length, pos] = this.parseNumber(bytes, pos);

    const str = this.binaryToString(bytes.slice(pos, pos + length));
    return [str, pos + length];
  }
  static parseTuple(bytes: Uint8Array, pos: number, structure: SchemaTuple): [Result, number] {
    const values: Result = [];
    for (let i = 0; i < structure.values.length; i++) {
      let value;
      [value, pos] = this.parseType(bytes, pos, structure.values[i]);
      values.push(value);
    }
    
    return [values, pos];
  }
  static parseArray(bytes: Uint8Array, pos: number, structure: SchemaArray): [Result, number] {
    let length: number;
    [length, pos] = this.parseNumber(bytes, pos);
    
    const values: Result = [];
    for (let i = 0; i < length; i++) {
      let value;
      [value, pos] = this.parseType(bytes, pos, structure.value);
      values.push(value);
    }
    
    return [values, pos];
  }
  static parseSchema(bytes: Uint8Array, pos: number, structure: Schema): [Result[], number] {
    const schema = structure;
    const result = [];

    const required = schema.required;
    const optionals = schema.optionals;

    let index = pos;
    
    for (let i = 0; i < required.length; i++) {
      let value: Result;
      [value, index] = this.parseType(bytes, index, required[i]);
      
      result.push(value);
    }

    let optional;
    [optional, index] = this.parseNumber(bytes, index);

    for (let i = 0; i < optionals.length; i++) {
      let value: Result = null;
      if (optional % 2 > 0) [value, index] = this.parseType(bytes, index, optionals[i]);

      result.push(value);
      optional >>= 1;
    }

    return [result, index];
  }

  static stringToBinary(str: string) {
    const bytes = new Uint8Array(str.length);

    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
    return bytes;
  }

  static binaryToString(bytes: Uint8Array) {
    return String.fromCharCode.apply(null, bytes);
  }
}