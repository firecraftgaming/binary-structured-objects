import { suite, test, should } from './utility';
import { array, BinaryTranslation, schema, string, tuple } from '../src/binary';
import { expect } from 'chai';

should;
@suite class BuildUnitTests {
  before() {

  }

  @test 'test string to binary'() {
    const string = 'test string';
    const binary = BinaryTranslation.stringToBinary(string);

    expect(binary).to.deep.equal(new Uint8Array([ 0x74, 0x65, 0x73, 0x74, 0x20, 0x73, 0x74, 0x72, 0x69, 0x6E, 0x67 ]));
  }

  @test 'test building binary schema with a string'() {
    const test_schema = schema([ string() ], []);
    const result = [ 'ABC' ];
    const built = BinaryTranslation.build(result, test_schema);

    expect(built).to.deep.equal(new Uint8Array([ 0x03, 0x41, 0x42, 0x43, 0x00 ]));
  }
  @test 'test building binary schema with an array'() {
    const test_schema = schema([ array(string()) ], []);
    const result = [ [ 'ABC' ] ];
    const built = BinaryTranslation.build(result, test_schema);

    expect(built).to.deep.equal(new Uint8Array([ 0x01, 0x03, 0x41, 0x42, 0x43, 0x00 ]));
  }
  @test 'test building binary schema with a tuple'() {
    const test_schema = schema([ tuple(string()) ], []);
    const result = [ [ 'ABC' ] ];
    const built = BinaryTranslation.build(result, test_schema);

    expect(built).to.deep.equal(new Uint8Array([ 0x03, 0x41, 0x42, 0x43, 0x00 ]));
  }

  @test 'test building binary schema with multiple strings'() {
    const test_schema = schema([ string(), string(), string() ], []);
    const result = [ 'ABC', 'DEF', 'GHI' ];
    const built = BinaryTranslation.build(result, test_schema);

    expect(built).to.deep.equal(new Uint8Array([ 0x03, 0x41, 0x42, 0x43,  0x03, 0x44, 0x45, 0x46,  0x03, 0x47, 0x48, 0x49,  0x00 ]));
  }
  @test 'test building binary schema with optional value'() {
    const test_schema = schema([ string(), string(), string() ], [ string() ]);
    const result = [ 'ABC', 'DEF', 'GHI', 'JKL' ];
    const built = BinaryTranslation.build(result, test_schema);

    expect(built).to.deep.equal(new Uint8Array([ 0x03, 0x41, 0x42, 0x43,  0x03, 0x44, 0x45, 0x46,  0x03, 0x47, 0x48, 0x49,  0x01,  0x03, 0x4A, 0x4B, 0x4C ]));
  }
  @test 'test building binary schema with non included optional value'() {
    const test_schema = schema([ string(), string(), string() ], [ string() ]);
    const result = [ 'ABC', 'DEF', 'GHI', null ];
    const built = BinaryTranslation.build(result, test_schema);

    expect(built).to.deep.equal(new Uint8Array([ 0x03, 0x41, 0x42, 0x43,  0x03, 0x44, 0x45, 0x46,  0x03, 0x47, 0x48, 0x49,  0x00 ]));
  }
  @test 'test building binary schema with optional value and non included optional value'() {
    const test_schema = schema([ string(), string(), string() ], [ string(), string() ]);
    const result = [ 'ABC', 'DEF', 'GHI', null, 'MNO' ];
    const built = BinaryTranslation.build(result, test_schema);

    expect(built).to.deep.equal(new Uint8Array([ 0x03, 0x41, 0x42, 0x43,  0x03, 0x44, 0x45, 0x46,  0x03, 0x47, 0x48, 0x49,  0x02,  0x03, 0x4D, 0x4E, 0x4F ]));
  }
}