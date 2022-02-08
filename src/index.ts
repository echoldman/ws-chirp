type UnionTypesNumberLabel = string | null;

interface ParamGuide {
  name: string;
  type: string;
  numberLabel: UnionTypesNumberLabel;
  pos: number;
  len: number;
}

interface ParamGuideWithData {
  name: string;
  type: string;
  numberLabel: UnionTypesNumberLabel;
  pos: number;
  len: number;
  data: ArrayBuffer;
  param: ValueUnionTypes;
}

interface Tailer {
  version: number;
  command: string;
  paramGuides: Array<ParamGuide>;
}

/**
 * |--------------------------------------------------------------------------|
 * | Type, and label  | DataView Type | Description                           |
 * |--------------------------------------------------------------------------|
 * | boolean          | Int64         | 1 to true, 0 to false                 |
 * | number: int      | Int64         | int64 value                           |
 * | number: uint     | Uint64        | uint64 value                          |
 * | number: float    | Float64       | float64 value                         |
 * | string           | Uint8Array    | string to Uint8Array                  |
 * | null             | Int64         | always to be 0                        |
 * | array            | Uint8Array    | array to json-string to Uint8Array   |
 * | object           | Uint8Array    | object to json-string to Uint8Array   |
 * | ArrayBuffer      | Buffer        |                                       |
 * | -------------------------------------------------------------------------|
 */

type ValueUnionTypes = boolean | number | string | null | Array<any> | object | ArrayBuffer;

const TYPE_BOOLEAN = 'boolean';
const TYPE_NUMBER = 'number';
const TYPE_STRING = 'string';
const TYPE_NULL = 'null';
const TYPE_ARRAY = 'array';
const TYPE_OBJECT = 'object';
const TYPE_ARRAYBUFFER = 'ArrayBuffer';

const LABEL_INT64 = 'int64';
const LABEL_UINT64 = 'uint64';
const LABEL_FLOAT64 = 'float64';

interface ParamGuideMap {
  [key: string]: ParamGuideWithData;
}

interface InfoArrayBuffer {
  len: number;
  data: ArrayBuffer;
}

const CHIRP_VERSION = 1;

const NUMBER_BIT_LEN = 64;
const BYTES_64BIT = 8

function int64Buffer (value: number): InfoArrayBuffer {
  const buffer = new ArrayBuffer(BYTES_64BIT);
  const view = new DataView(buffer);
  view.setBigInt64(0, BigInt.asIntN(NUMBER_BIT_LEN, BigInt(value)), true);
  return { len: BYTES_64BIT, data: buffer};
}

const uint64Buffer = function (value: number): InfoArrayBuffer {
  const buffer = new ArrayBuffer(BYTES_64BIT);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt.asUintN(NUMBER_BIT_LEN, BigInt(value)), true);
  return { len: BYTES_64BIT, data: buffer };
}

const float64Buffer = function (value: number): InfoArrayBuffer {
  const buffer = new ArrayBuffer(BYTES_64BIT);
  const view = new DataView(buffer);
  view.setFloat64(0, value, true);
  return { len: BYTES_64BIT, data: buffer };
}

const stringBuffer = function (value: string): InfoArrayBuffer {
  const encoder = new TextEncoder();
  const uint8_array: Uint8Array = encoder.encode(value);
  return { len: uint8_array.byteLength, data: uint8_array.buffer }
}

const objectBuffer = function (value: object): InfoArrayBuffer {
  const object_json = JSON.stringify(value);
  return stringBuffer(object_json);
}

function getValueTypeString (value: ValueUnionTypes): string {
  const prototype_string = Object.prototype.toString.call(value);
  if (prototype_string === '[object Boolean]') {
    return TYPE_BOOLEAN;
  } else if (prototype_string === '[object Number]') {
    return TYPE_NUMBER;
  } else if (prototype_string === '[object String]') {
    return TYPE_STRING;
  } else if (prototype_string === '[object Null]') {
    return TYPE_NULL;
  } else if (prototype_string === '[object Array]') {
    return TYPE_ARRAY;
  } else if (prototype_string === '[object Object]') {
    return TYPE_OBJECT;
  } else if (prototype_string === '[object ArrayBuffer]') {
    return TYPE_ARRAYBUFFER;
  } else {
    throw new Error('the-param-is-invalid-type')
  }
}

function convertParam (name: string, param: ValueUnionTypes, numberLabel: UnionTypesNumberLabel): ParamGuideWithData {
  let data_info: InfoArrayBuffer;
  const param_type = getValueTypeString (param)

  if (param_type === TYPE_BOOLEAN) {
    data_info = int64Buffer(param as boolean ? 1 : 0);
  } else if (param_type === TYPE_NUMBER) {
    if (numberLabel === LABEL_INT64) {
      data_info = int64Buffer(param as number);
    } else if (numberLabel === LABEL_UINT64) {
      data_info = uint64Buffer(param as number);
    } else if (numberLabel === LABEL_FLOAT64) {
      data_info = float64Buffer(param as number);
    } else {
      throw new Error(`invalid-number-label: ${numberLabel}`)
    }
  } else if (param_type === TYPE_STRING) {
    data_info = stringBuffer(param as string);
  } else if (param_type === TYPE_NULL) {
    data_info = int64Buffer(0);
  } else if (param_type === TYPE_ARRAY) {
    data_info = objectBuffer(param as object);
  } else if (param_type === TYPE_OBJECT) {
    data_info = objectBuffer(param as object);
  } else if (param_type === TYPE_ARRAYBUFFER) {
    const data = param as ArrayBuffer;
    data_info = { len: data.byteLength, data: data };
  } else {
    throw new Error('the-param-is-invalid-type')
  }

  return {
    name: name,
    type: param_type,
    numberLabel: numberLabel,
    pos: 0,
    len: data_info.len,
    data: data_info.data,
    param: param
  }
}

export class Chirp {
  private _version: number;
  private _command: string;
  private _paramGuideMap: ParamGuideMap;

  constructor (command: string) {
    this._version = CHIRP_VERSION;
    this._command = command;
    this._paramGuideMap = {};
  }

  public get version (): number {
    return this._version;
  }

  public get command (): string {
    return this._command;
  }

  public addParam (name: string, param: ValueUnionTypes, numberLabel: UnionTypesNumberLabel): void {
    this._paramGuideMap[name] = convertParam(name, param, numberLabel);
  }

  public getParam (name: string): ValueUnionTypes {
    if (this.hasParam(name)) {
      return this._paramGuideMap[name].param;
    } else {
      throw new Error(`invaild-param-name: ${name}`);
    }
  }

  public hasParam (name: string): boolean {
    return Object.prototype.hasOwnProperty.call(this._paramGuideMap, name);
  }

  public toArrayBuffer (): ArrayBuffer {
    const param_guide_with_data_list: Array<ParamGuideWithData> = [];
    const param_guide_list: Array<ParamGuide> = []

    // 存储 tailer-pos 数据位于起始 0，类型为一个64位整数
    let buffer_length = BYTES_64BIT;
    let param_last_pos = BYTES_64BIT;

    // 所有参数的长度
    for (const name in Object.keys(this._paramGuideMap)) {
      const param_guide_with_data: ParamGuideWithData = this._paramGuideMap[name];
      param_guide_with_data.pos = param_last_pos;

      const param_guide: ParamGuide = {
        name: param_guide_with_data.name,
        type: param_guide_with_data.type,
        numberLabel: param_guide_with_data.numberLabel,
        pos: param_last_pos,
        len: param_guide_with_data.len
      }

      param_last_pos = param_last_pos + param_guide.len
      buffer_length = buffer_length + param_guide.len

      param_guide_with_data_list.push(param_guide_with_data);
      param_guide_list.push(param_guide);
    }

    // Tailer 的长度
    const tailer = {
      version: CHIRP_VERSION,
      command: this._command,
      paramGuides: param_guide_list
    }
    const tailer_info = objectBuffer(tailer);
    const tailer_pos = param_last_pos + tailer_info.len
    buffer_length = buffer_length + tailer_info.len;

    // TODO: 计算总和并合并为 ArrayBuffer
    const buffer = new ArrayBuffer(buffer_length);
    const buffer_view = new DataView(buffer);
    
    // 写入 tailer-pos
    buffer_view.setBigInt64(0, BigInt(tailer_pos), true);

    // 写入所有的 params
    for (const param of param_guide_with_data_list) {
      for (let i = 0; i < param.len; i++) {
        const param_view = new DataView(param.data);
        buffer_view.setUint8(param.pos + i, param_view.getUint8(i));
      }
    }

    // 写入 tailer
    const tailer_view = new DataView(tailer_info.data);
    for (let i = 0; i < tailer_info.len; i++) {
      buffer_view.setUint8(tailer_pos + i, tailer_view.getUint8(i));
    }

    return buffer;
  }

  public static fromArrayBuffer(buffer: ArrayBuffer): Chirp {
    const buffer_view = new DataView(buffer);
    const decoder = new TextDecoder();

    // TODO: 读取 tailer pos
    const tailer_pos = Number(buffer_view.getBigInt64(0, true));

    // TODO: 读取 tailer
    const tailer_length = buffer.byteLength - tailer_pos;
    const tailer_buffer = new ArrayBuffer(tailer_length);
    const tailer_buffer_view = new DataView(tailer_buffer);
    for (let i = 0; i < tailer_length; i++) {
      tailer_buffer_view.setUint8(i, buffer_view.getUint8(tailer_pos + i));
    }
    const tailer_json = decoder.decode(tailer_buffer);
    const tailer: Tailer = JSON.parse(tailer_json);

    // TODO: 检查 tailer 数据合法性
    if (getValueTypeString(tailer.version) !== TYPE_NUMBER) throw new Error('invalid-version-type-in-tailer');
    if (getValueTypeString(tailer.command) !== TYPE_STRING) throw new Error('invalid-command-type-in-tailer');
    if (getValueTypeString(tailer.paramGuides) !== TYPE_ARRAY) throw new Error('invalid-param-guides-type-in-tailer');

    // TODO: 创建 chirp
    const chirp = new Chirp(tailer.command);

    // TODO: 通过 tailer.paramGuides 读取所有参数，保存到 chirp 里
    for (const param_guide of tailer.paramGuides) {
      // TODO: 检查 param_guide 数据合法性
      if (getValueTypeString(param_guide.name) !== TYPE_STRING) throw new Error('invalid-name-type-in-tailer-param-guide');
      if (getValueTypeString(param_guide.type) !== TYPE_STRING) throw new Error('invalid-type-type-in-tailer-param-guide');
      if (getValueTypeString(param_guide.pos) !== TYPE_NUMBER) throw new Error('invalid-pos-type-in-tailer-param-guide');
      if (getValueTypeString(param_guide.len) !== TYPE_NUMBER) throw new Error('invalid-len-type-in-tailer-param-guide');
      const number_label_type = getValueTypeString(param_guide.numberLabel);
      if (number_label_type !== TYPE_STRING && number_label_type !== TYPE_NULL) throw new Error('invalid-number-label-type-in-tailer-param-guide')

      // TODO: 读取参数
      if (param_guide.type === TYPE_BOOLEAN) {

      } else if (param_guide.type === TYPE_NUMBER) {
        if (param_guide.numberLabel === LABEL_INT64) {

        } else if (param_guide.numberLabel === LABEL_UINT64) {

        } else if (param_guide.numberLabel === LABEL_FLOAT64) {

        } else {
          throw new Error('invaild-number-label-in-tailer-param-guide');
        }
      } else if (param_guide.type === TYPE_STRING) {

      } else if (param_guide.type === TYPE_NULL) {

      } else if (param_guide.type === TYPE_ARRAY) {

      } else if (param_guide.type === TYPE_OBJECT) {

      } else if (param_guide.type === TYPE_ARRAYBUFFER) {
        
      } else {
        throw new Error('invaild-type-in-tailer-param-guide');
      }
    }

    return chirp;
  }
}
