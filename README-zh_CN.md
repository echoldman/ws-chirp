# ws-chirp

## 安装

~~~bash
npm install --save ws-chipr
~~~

## 使用

**需要将 WebSocket 二进制类型设置为 ArrayBuffer**

~~~js
import { Chirp } from 'ws-chirp';

const chirp = new Chirp('hello');
chirp.addParam('msg', 'hello world.');
chirp.addParam('count', 9007199254740991);
chirp.addParam('price', 19.99);
chirp.addParam('skus', ['blue', 'green', 'yellow']);
chirp.addParam('info', {
  'phone': '+86-010505103',
  'home': 'JianGuo lu 168 hao'
});
const a_buffer = new ArrayBuffer(1024*1024*32);
const a_view = new DataView(a_buffer);
for (let i = 0; i < a_buffer.byteLength; i++) {
  a_view.setUint8(i, Math.ceil(Math.random() * 255));
}
chirp.addParam('mydata', a_buffer);

const data = chirp.toData();

// ... 通过 WebSocket 传递 data 后

const new_chirp = Chirp.fromData(data);
console.log(new_chirp.getParam('msg'));
console.log(new_chirp.getParam('count'));
console.log(new_chirp.getParam('price'));
console.log(new_chirp.getParam('skus'));
console.log(new_chirp.getParam('info'));
console.log(new_chirp.getParam('mydata'));
~~~

