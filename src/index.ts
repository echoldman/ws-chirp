type NumberLabelUnionTypes = string | null;

interface ParamGuide {
  name: string;
  type: string;
  numberLabel: NumberLabelUnionTypes;
  pos: number;
  len: number;
}

interface ParamGuideWithData {
  name: string;
  type: string;
  numberLabel: NumberLabelUnionTypes;
  pos: number;
  len: number;
  data: ArrayBuffer;
  value: ValueUnionTypes;
}

interface Tailer {
  call: string;
  version: number;
  paramGuides: Array<ParamGuide>;
}

/**
 * |--------------------------------------------------------------------------|
 * | Type, and label  | DataView Type | Description                           |
 * |--------------------------------------------------------------------------|
 * | boolean          | Int64         | 0 to false, other integers ar true    |
 * | number: int      | Int64         | int64 value                           |
 * | number: uint     | Uint64        | uint64 value                          |
 * | number: float    | Float64       | float64 value                         |
 * | string           | Uint8Array    | string to Uint8Array                  |
 * | null             | Int64         | always to be 0                        |
 * | object           | Uint8Array    | object to json-string to Uint8Array   |
 * | array            | Uint8Array    | array to json-string to Uint8Array    |
 * | ArrayBuffer      | Buffer        |                                       |
 * | -------------------------------------------------------------------------|
 */

type CBoolean = boolean;
type CNumber = number;
type CString = string;
type CNull = null;
type CObject = object;
type CArray = Array<any>;
type CBin = ArrayBuffer;
type ValueUnionTypes = CBoolean | CNumber | CString | CNull | CObject | CArray | CBin;

type DataUnionTypes = ArrayBuffer

const TYPE_BOOLEAN = 'boolean';
const TYPE_NUMBER = 'number';
const TYPE_STRING = 'string';
const TYPE_NULL = 'null';
const TYPE_OBJECT = 'object';
const TYPE_ARRAY = 'array';
const TYPE_BIN = 'bin';

const LABEL_INT64 = 'int64';
const LABEL_UINT64 = 'uint64';
const LABEL_FLOAT64 = 'float64';
const LABEL_NULL = null;

interface ParamItem {
  value: ValueUnionTypes;
  type: string;
  numberLabel: NumberLabelUnionTypes;
}

interface ParamMap {
  [key: string]: ParamItem;
}

interface InfoArrayBuffer {
  len: number;
  data: ArrayBuffer;
}

const CHIRP_VERSION = 1;
const NUMBER_BIT_LEN = 64;
const BYTES_64BIT = 8

function int64Buffer (value: CNumber): InfoArrayBuffer {
  const buffer = new ArrayBuffer(BYTES_64BIT);
  const view = new DataView(buffer);
  view.setBigInt64(0, BigInt.asIntN(NUMBER_BIT_LEN, BigInt(value)), true);
  return { len: BYTES_64BIT, data: buffer};
}

function bufferInt64 (buffer: ArrayBuffer, pos: number): CNumber {
  const view = new DataView(buffer, pos, BYTES_64BIT);
  return Number(view.getBigInt64(0, true));
}

function uint64Buffer (value: CNumber): InfoArrayBuffer {
  const buffer = new ArrayBuffer(BYTES_64BIT);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt.asUintN(NUMBER_BIT_LEN, BigInt(value)), true);
  return { len: BYTES_64BIT, data: buffer };
}

function bufferUint64 (buffer: ArrayBuffer, pos: number): CNumber {
  const view = new DataView(buffer, pos, BYTES_64BIT);
  return Number(view.getBigUint64(0, true))
}

function float64Buffer (value: CNumber): InfoArrayBuffer {
  const buffer = new ArrayBuffer(BYTES_64BIT);
  const view = new DataView(buffer);
  view.setFloat64(0, value, true);
  return { len: BYTES_64BIT, data: buffer };
}

function bufferFloat64 (buffer: ArrayBuffer, pos: number): CNumber {
  const view = new DataView(buffer, pos);
  return Number(view.getFloat64(0, true));
}

function stringBuffer (value: CString): InfoArrayBuffer {
  const encoder = new TextEncoder();
  const uint8_array: Uint8Array = encoder.encode(value);
  return { len: uint8_array.byteLength, data: uint8_array.buffer }
}

function bufferString (buffer: ArrayBuffer, pos: number, len: number): CString {
  const decoder = new TextDecoder('utf-8');
  const view = new Uint8Array(buffer, pos, len);
  return decoder.decode(view);
}

function objectBuffer (value: CObject): InfoArrayBuffer {
  const object_json = JSON.stringify(value);
  return stringBuffer(object_json);
}

function bufferObject (buffer: ArrayBuffer, pos: number, len: number): CObject {
  const object_json = bufferString(buffer, pos, len);
  return JSON.parse(object_json);
}

function arrayBuffer (value: CArray): InfoArrayBuffer {
  const object_json = JSON.stringify(value);
  return stringBuffer(object_json);
}

function bufferArray (buffer: ArrayBuffer, pos: number, len: number): CArray {
  const object_json = bufferString(buffer, pos, len);
  return JSON.parse(object_json); 
}

function bufferCopy (buffer: ArrayBuffer, pos: number, len: number): ArrayBuffer {
  return buffer.slice(pos, pos + len);
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
  } else if (prototype_string === '[object Object]') {
    return TYPE_OBJECT;
  } else if (prototype_string === '[object Array]') {
    return TYPE_ARRAY;
  } else if (prototype_string === '[object ArrayBuffer]') {
    return TYPE_BIN;
  } else {
    throw new Error('the-param-is-invalid-type')
  }
}

function getParamItem (value: ValueUnionTypes): ParamItem {
  const value_type = getValueTypeString(value);
  let number_label = null;
  if (value_type === TYPE_NUMBER) {
    const value_number = value as CNumber;
    if (value_number % 1 === 0) {
      if (value_number < 0) {
        number_label = LABEL_INT64;
      } else {
        number_label = LABEL_UINT64;
      }
    } else {
      number_label = LABEL_FLOAT64;
    }
  } else {
    number_label = LABEL_NULL;
  }

  return {
    value: value,
    type: value_type,
    numberLabel: number_label
  }
}

function convertParam (name: string, value: ValueUnionTypes, numberLabel: NumberLabelUnionTypes): ParamGuideWithData {
  let data_info: InfoArrayBuffer;
  const param_type = getValueTypeString (value)

  if (param_type === TYPE_BOOLEAN) {
    data_info = int64Buffer(value as CBoolean ? 1 : 0);
  } else if (param_type === TYPE_NUMBER) {
    if (numberLabel === LABEL_INT64) {
      data_info = int64Buffer(value as CNumber);
    } else if (numberLabel === LABEL_UINT64) {
      data_info = uint64Buffer(value as CNumber);
    } else if (numberLabel === LABEL_FLOAT64) {
      data_info = float64Buffer(value as CNumber);
    } else {
      throw new Error(`invalid-number-label: ${numberLabel}`)
    }
  } else if (param_type === TYPE_STRING) {
    data_info = stringBuffer(value as CString);
  } else if (param_type === TYPE_NULL) {
    data_info = int64Buffer(0);
  } else if (param_type === TYPE_OBJECT) {
    data_info = objectBuffer(value as CObject);
  } else if (param_type === TYPE_ARRAY) {
    data_info = arrayBuffer(value as CArray);
  } else if (param_type === TYPE_BIN) {
    const data = value as ArrayBuffer;
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
    value: value
  }
}

export class Chirp {
  private _call: string;
  private _version: number;
  private _paramMap: ParamMap;

  constructor (call: string) {
    this._call = call;
    this._version = CHIRP_VERSION;
    this._paramMap = {};
  }

  public get version (): number {
    return this._version;
  }

  public get call (): string {
    return this._call;
  }

  public addParam (name: string, value: ValueUnionTypes): void {
    this._paramMap[name] = getParamItem(value);
  }

  public getParam (name: string): ValueUnionTypes {
    if (this.hasParam(name)) {
      return this._paramMap[name].value;
    } else {
      throw new Error(`invaild-param-name: ${name}`);
    }
  }

  public hasParam (name: string): boolean {
    return Object.prototype.hasOwnProperty.call(this._paramMap, name);
  }

  public toData (): ArrayBuffer {
    const param_guide_with_data_list: Array<ParamGuideWithData> = [];
    const param_guide_list: Array<ParamGuide> = []

    // 存储 tailer-pos 数据位于起始 0，类型为一个64位整数
    let buffer_length = BYTES_64BIT;
    let param_last_pos = BYTES_64BIT;

    // 所有参数的长度
    for (const name of Object.keys(this._paramMap)) {
      const param_item = this._paramMap[name];
      const param_guide_with_data: ParamGuideWithData = convertParam(name, param_item.value, param_item.numberLabel);
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
    const tailer: Tailer = {
      call: this._call,
      version: CHIRP_VERSION,
      paramGuides: param_guide_list
    }
    const tailer_info = objectBuffer(tailer);
    const tailer_pos = param_last_pos
    buffer_length = buffer_length + tailer_info.len;

    // 计算总和，并为 ArrayBuffer
    const buffer = new ArrayBuffer(buffer_length);
    const buffer_dataview = new DataView(buffer);
    const buffer_uint8view = new Uint8Array(buffer);
    
    // 写入 tailer-pos
    buffer_dataview.setBigInt64(0, BigInt(tailer_pos), true);

    // 写入所有的 params
    for (const param of param_guide_with_data_list) {
      buffer_uint8view.set(new Uint8Array(param.data), param.pos);
    }

    // 写入 tailer
    buffer_uint8view.set(new Uint8Array(tailer_info.data), tailer_pos);

    return buffer;
  }

  public static fromData(data: DataUnionTypes): Chirp {
    let buffer;
    const data_type = Object.prototype.toString.call(data);
    if (data_type === '[object ArrayBuffer]') {
      buffer = data as ArrayBuffer;
    } else {
      throw new Error('invalid-data-type-must-be-ArrayBuffer-or-UintArray-or-DataView');
    }
    const buffer_view = new DataView(buffer);

    // 读取 tailer pos
    const tailer_pos = Number(buffer_view.getBigInt64(0, true));

    // 读取 tailer
    const tailer = bufferObject(buffer, tailer_pos, buffer.byteLength - tailer_pos) as Tailer;

    // 检查 tailer 数据合法性
    if (getValueTypeString(tailer.call) !== TYPE_STRING) throw new Error('invalid-call-type-in-tailer');
    if (getValueTypeString(tailer.version) !== TYPE_NUMBER) throw new Error('invalid-version-type-in-tailer');
    if (getValueTypeString(tailer.paramGuides) !== TYPE_ARRAY) throw new Error('invalid-param-guides-type-in-tailer');

    // 创建 chirp
    const chirp = new Chirp(tailer.call);

    // 通过 tailer.paramGuides 读取所有参数，保存到 chirp 里
    for (const param_guide of tailer.paramGuides) {
      // 检查 param_guide 数据合法性
      if (getValueTypeString(param_guide.name) !== TYPE_STRING) throw new Error('invalid-name-type-in-tailer-param-guide');
      if (getValueTypeString(param_guide.type) !== TYPE_STRING) throw new Error('invalid-type-type-in-tailer-param-guide');
      if (getValueTypeString(param_guide.pos) !== TYPE_NUMBER) throw new Error('invalid-pos-type-in-tailer-param-guide');
      if (getValueTypeString(param_guide.len) !== TYPE_NUMBER) throw new Error('invalid-len-type-in-tailer-param-guide');
      const number_label_type = getValueTypeString(param_guide.numberLabel);
      if (number_label_type !== TYPE_STRING && number_label_type !== TYPE_NULL) throw new Error('invalid-number-label-type-in-tailer-param-guide')

      // 读取参数
      if (param_guide.type === TYPE_BOOLEAN) {
        const value = bufferInt64(buffer, param_guide.pos);
        chirp.addParam(param_guide.name, value === 0 ? false : true);
      } else if (param_guide.type === TYPE_NUMBER) {
        if (param_guide.numberLabel === LABEL_INT64) {
          const value = bufferInt64(buffer, param_guide.pos);
          chirp.addParam(param_guide.name, value);
        } else if (param_guide.numberLabel === LABEL_UINT64) {
          const value = bufferUint64(buffer, param_guide.pos);
          chirp.addParam(param_guide.name, value);
        } else if (param_guide.numberLabel === LABEL_FLOAT64) {
          const value = bufferFloat64(buffer, param_guide.pos);
          chirp.addParam(param_guide.name, value);
        } else {
          throw new Error('invaild-number-label-in-tailer-param-guide');
        }
      } else if (param_guide.type === TYPE_STRING) {
        const value = bufferString(buffer, param_guide.pos, param_guide.len);
        chirp.addParam(param_guide.name, value);
      } else if (param_guide.type === TYPE_NULL) {
        chirp.addParam(param_guide.name, null);
      } else if (param_guide.type === TYPE_OBJECT) {
        const value = bufferObject(buffer, param_guide.pos, param_guide.len);
        chirp.addParam(param_guide.name, value);
      } else if (param_guide.type === TYPE_ARRAY) {
        const value = bufferArray(buffer, param_guide.pos, param_guide.len);
        chirp.addParam(param_guide.name, value);
      } else if (param_guide.type === TYPE_BIN) {
        chirp.addParam(param_guide.name, bufferCopy(buffer, param_guide.pos, param_guide.len));
      } else {
        throw new Error('invaild-type-in-tailer-param-guide');
      }
    }

    return chirp;
  }
}
