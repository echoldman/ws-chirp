import { WebSocket, RawData } from 'ws';
import { Chirp } from '../index';

const client = new WebSocket('ws://127.0.0.1:3001');

client.on('open', () => {
  console.log('WebSocket opened.');

  const chirp = new Chirp('hello');
  chirp.addParam('msg', 'hello, web socket.');
  chirp.addParam('count', 9007199254740991);
  chirp.addParam('price', 19.99);
  chirp.addParam('skus', ['blue', 'yellow', 'red', 'green']);
  const data = chirp.toData();
  client.send(data);
  
  // const data = new ArrayBuffer(8);
  // const view = new DataView(data);
  // view.setBigInt64(0, BigInt(8), true);
  // client.send(data);

  // const chirp = new Chirp('b');
  // chirp.addParam('a', 8);
  // const data = chirp.toData();
  // client.send(data);
});

// client.on('message', (data: RawData) => {
//   const data_type = Object.prototype.toString.call(data);
//   console.log(data_type);
//   console.log(data);
// });
