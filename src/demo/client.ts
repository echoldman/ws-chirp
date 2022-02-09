import { WebSocket } from 'ws';
import { Chirp } from '../index';

const client = new WebSocket('ws://127.0.0.1:3001');

client.on('open', () => {
  console.log('WebSocket opened.');

  const chirp = new Chirp('hello');
  // chirp.addParam('msg', 'hello, web socket.');
  // chirp.addParam('count', 9007199254740991);
  // chirp.addParam('price', 19.99);
  // chirp.addParam('skus', ['blue', 'yellow', 'red', 'green']);
  // client.send(chirp.toData());
  
  const data = new ArrayBuffer(8);
  const view = new DataView(data);
  view.setBigInt64(0, BigInt(8));
  client.send(data);
});
