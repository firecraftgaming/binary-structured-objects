import { suite, test, should } from './utility';
import { expect } from 'chai';

import { BinaryStructuredObjectsSchema, buildDataSchema, buildSchema, constructSchema, SchemaType } from '../src/api';
import { BinaryLanguageFile } from '../src';

const testing_types: BinaryStructuredObjectsSchema['types'] = {
  ID: {
    kind: 'alias',
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

const test_data = {
  id: '1',
  name: 'Test Library',
  books: [
    {
      id: '1',
      title: 'Test Book',
      author: 'Test Author',
      pages: 100,
      bestSeller: true,
      reviews: [
        'Test Review 1',
        'Test Review 2',
      ]
    },
    {
      id: '2',
      title: 'Test Book 2',
      author: 'Test Author 2',
      pages: 200,
      bestSeller: false,
    }
  ]
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

should;
@suite class ApiUnitTests {
  before() {

  }

  
  @test 'test building BSOS type to binary schema'() {
    const result = buildSchema(testing_types, testing_types.Library as SchemaType);    
    expect(result.type).to.equal(test_schema.type);
    expect(result.required).to.be.an('array').that.does.have.deep.members(test_schema.required);
    expect(result.optionals).to.be.an('array').that.does.have.deep.members(test_schema.optionals);
  }
  
  @test 'test building BSOS type to binary intermediate and back'() {
    const build = buildDataSchema(testing_types, testing_types.Library as SchemaType, test_data);
    const result = constructSchema(testing_types, testing_types.Library as SchemaType, build);

    expect(result).to.deep.equal(test_data);
  }

  @test 'test building BSOS type to binary and back'() {
    const schema = buildSchema(testing_types, testing_types.Library as SchemaType);    

    const build_bi = buildDataSchema(testing_types, testing_types.Library as SchemaType, test_data);
    const build = BinaryLanguageFile.build(build_bi, schema);

    const parse_bi = BinaryLanguageFile.parse(build, schema);
    const parse = constructSchema(testing_types, testing_types.Library as SchemaType, parse_bi);

    expect(parse).to.deep.equal(test_data);
  }
}