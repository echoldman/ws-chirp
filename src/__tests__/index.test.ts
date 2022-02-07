import { hello } from '../index';

test('hello', () => {
  expect(hello('test')).toBe('hello test');
});
