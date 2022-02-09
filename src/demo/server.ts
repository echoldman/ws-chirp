import { WebSocketServer, WebSocket, RawData } from 'ws';
import { Chirp } from '../index';

const server = new WebSocketServer({
  port: 3001
});

server.on('listening', () => {
  console.log('server is started.');
});

server.on('connection', (socket: WebSocket, request) => {
  socket.on('message', (data: RawData) => {
    const data_type = Object.prototype.toString.call(data);
    if (data_type === '[object Uint8Array]') {
      const chirp = Chirp.fromData(data as Uint8Array);
      console.log(chirp.getParam('msg'));
      console.log(chirp.getParam('count'));
      console.log(chirp.getParam('price'));
      console.log(chirp.getParam('skus'));
    } else {
      console.log(data_type);
      console.log(data);
    }
  });

  socket.on('close', (code, reason) => {
    console.log('Socket Close:');
    console.log(`\tclose code: ${code}`);
    console.log(reason);
  })

  socket.on('error', error => {
    console.log('Socket Error:');
    console.log(`\terror: ${error.message}`);
  })
});
