import { Chirp } from '../index';

interface Object1 {
  code: number;
  values: Array<number>;
  chars: Array<string>;
}

test('chirp', () => {
  const object1: Object1 = {
    code: 200,
    values: [1, 2, 3, 4, 5],
    chars: ['a', 'b', 'c']
  }

  const chirp = new Chirp('hello');
  chirp.addParam('message', 'hello, world!');
  chirp.addParam('str1', '2020 北京冬奥会');
  chirp.addParam('str2', '123&&');
  chirp.addParam('object1', object1);
  chirp.addParam('main', 3);
  chirp.addParam('min', 23.0123);
  chirp.addParam('count', 9007199254740991);
  chirp.addParam('age', -9007199254740991)

  const buffer = chirp.toArrayBuffer();
  const new_chirp = Chirp.fromArrayBuffer(buffer);
  expect(new_chirp.getParam('message')).toBe('hello, world!');
  expect(new_chirp.getParam('str1')).toBe('2020 北京冬奥会')
  expect(new_chirp.getParam('str2')).toBe('123&&');

  const expect_object1 = chirp.getParam('object1') as Object1;
  expect(expect_object1.code).toBe(200);
  expect(expect_object1.values[0]).toBe(1);
  expect(expect_object1.values[1]).toBe(2);
  expect(expect_object1.values[2]).toBe(3);
  expect(expect_object1.values[3]).toBe(4);
  expect(expect_object1.values[4]).toBe(5);
  
  expect(expect_object1.chars[0]).toBe('a');
  expect(expect_object1.chars[1]).toBe('b');
  expect(expect_object1.chars[2]).toBe('c');

  expect(new_chirp.getParam('main')).toBe(3);
  expect(new_chirp.getParam('min')).toBe(23.0123);
  expect(new_chirp.getParam('count')).toBe(9007199254740991);
  expect(new_chirp.getParam('age')).toBe(-9007199254740991);
});
