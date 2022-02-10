import { Chirp } from '../index';

const chirp = new Chirp('hello');
chirp.addParam('msg', 'hello world.');
chirp.addParam('count', 1001);
chirp.addParam('price', 19.99);
chirp.addParam('skus', ['blue', 'green', 'yellow']);
const data = chirp.toData();
const view = new DataView(data);
const buffer = view.buffer;
const a = new Uint8Array(buffer);
const a_buffer = a.buffer;
console.log(buffer);
