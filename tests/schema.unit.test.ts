import { suite, test, should } from './utility';
import { expect } from 'chai';

import * as fs from 'fs';
import { BinaryStructuredObjectsSchema, BinaryStructuredObjectsTypes } from '../src/schema';

const file = fs.readFileSync(__dirname + '/files/schema.bsos', 'utf8');
const testing_types: BinaryStructuredObjectsTypes = {
  ID: {
    kind: 'ref',
    type: 'string',
  },
  Book: {
    kind: 'schema',
    type: {
      id: {
        type: {
          kind: 'ref',
          type: 'ID',
        },
        optional: false,
      },
      title: {
        type: {
          kind: 'ref',
          type: 'string',
        },
        optional: false,
      },
      author: {
        type: {
          kind: 'ref',
          type: 'string',
        },
        optional: false,
      },
      pages: {
        type: {
          kind: 'ref',
          type: 'number',
        },
        optional: false,
      },
      bestSeller: {
        type: {
          kind: 'ref',
          type: 'boolean',
        },
        optional: false,
      },
      reviews: {
        type: {
          kind: 'array',
          type: {
            kind: 'ref',
            type: 'string',
          },
        },
        optional: true,
      },
    },
  },
  Library: {
    kind: 'schema',
    type: {
      id: {
        type: {
          kind: 'ref',
          type: 'ID',
        },
        optional: false,
      },
      name: {
        type: {
          kind: 'ref',
          type: 'string',
        },
        optional: false,
      },
      books: {
        type: {
          kind: 'array',
          type: {
            kind: 'ref',
            type: 'Book',
          },
        },
        optional: false,
      },
    },
  }
};
const test_schema = {
  type: 'schema',

  required: [
    {
      type: 'string',
    },
    {
      type: 'string',
    },
    {
      type: 'array',
      value: {
        type: 'schema',
        required: [
          {
            type: 'string',
          },
          {
            type: 'string',
          },
          {
            type: 'string',
          },
          {
            type: 'number',
          },
          {
            type: 'boolean',
          },
        ],
        optionals: [
          {
            type: 'array',
            value: {
              type: 'string',
            },
          },
        ]
      }
    },
  ],
  optionals: []
};
const test_schemas = {
  Library: test_schema,
}

should;
@suite class SchemaUnitTests {
  before() {

  }
  
  @test 'test building BSOS types from schema file'() {
    const schema = new BinaryStructuredObjectsSchema(file);
    expect(schema.types).to.deep.equal(testing_types);
    expect(schema.schemas).to.deep.equal(test_schemas);
  }
}