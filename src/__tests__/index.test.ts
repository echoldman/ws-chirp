import { Chirp } from '../index';
const md5 = require('md5');

interface Object1 {
  code: number;
  values: Array<number>;
  chars: Array<string>;
}

test('chirp', () => {
  const chirp = new Chirp('hello');
  chirp.addParam('message', 'hello, world!');
  chirp.addParam('str1', '2020 北京冬奥会');
  chirp.addParam('str2', '123&&');
  chirp.addParam('main', 3);
  chirp.addParam('min', 23.0123);
  chirp.addParam('count', 9007199254740991);
  chirp.addParam('age', -9007199254740991)

  const object1: Object1 = {
    code: 200,
    values: [1, 2, 3, 4, 5],
    chars: ['a', 'b', 'c']
  }
  chirp.addParam('object1', object1);

  const array1 = ['abc', 10, null];
  chirp.addParam('list', array1);

  // TODO: 测试大内存复制的性能
  const a_buffer = new ArrayBuffer(1024*1024*32);
  const a_view = new DataView(a_buffer);
  for (let i = 0; i < a_buffer.byteLength; i++) {
    a_view.setUint8(i, Math.ceil(Math.random() * 255));
  }
  chirp.addParam('data', a_buffer);
  const data_md5 = md5(a_buffer);

  const new_buffer = chirp.toArrayBuffer();
  const new_chirp = Chirp.fromArrayBuffer(new_buffer);
  expect(new_chirp.getParam('message')).toBe('hello, world!');
  expect(new_chirp.getParam('str1')).toBe('2020 北京冬奥会')
  expect(new_chirp.getParam('str2')).toBe('123&&');
  expect(new_chirp.getParam('main')).toBe(3);
  expect(new_chirp.getParam('min')).toBe(23.0123);
  expect(new_chirp.getParam('count')).toBe(9007199254740991);
  expect(new_chirp.getParam('age')).toBe(-9007199254740991);

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

  const expect_array1: Array<any> = new_chirp.getParam('list') as Array<any>;
  expect(expect_array1[0]).toBe('abc');
  expect(expect_array1[1]).toBe(10);
  expect(expect_array1[2]).toBe(null);

  const expect_data = new_chirp.getParam('data') as ArrayBuffer;
  expect(md5(expect_data)).toBe(data_md5);
});
