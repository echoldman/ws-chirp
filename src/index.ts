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
 * | object           | Uint8Array    | object to json-string to Uint8Array   |
 * | ArrayBuffer      | Buffer        |                                       |
 * | -------------------------------------------------------------------------|
 */

type UnionTypesParam = boolean | number | string | null | object | ArrayBuffer;

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

function getParamTypeString (param: UnionTypesParam): string {
  const prototype_string = Object.prototype.toString.call(param);
  if (prototype_string === '[object Boolean]') {
    return 'boolean';
  } else if (prototype_string === '[object Number]') {
    return 'number';
  } else if (prototype_string === '[object String]') {
    return 'string';
  } else if (prototype_string === '[object Null]') {
    return 'null';
  } else if (prototype_string === '[object Object]') {
    return 'object';
  } else if (prototype_string === '[object DataView]') {
    return 'DataView';
  } else {
    throw new Error('the-param-is-invalid-type')
  }
}

function convertParam (name: string, param: UnionTypesParam, numberLabel: UnionTypesNumberLabel): ParamGuideWithData {
  let data_info: InfoArrayBuffer;
  const param_type = getParamTypeString (param)

  if (param_type === 'boolean') {
    data_info = int64Buffer(param as boolean ? 1 : 0);
  } else if (param_type === 'number') {
    if (numberLabel === 'int') {
      data_info = int64Buffer(param as number);
    } else if (numberLabel === 'uint') {
      data_info = uint64Buffer(param as number);
    } else if (numberLabel === 'float64') {
      data_info = float64Buffer(param as number);
    } else {
      throw new Error(`invalid-number-label: ${numberLabel}`)
    }
  } else if (param_type === 'string') {
    data_info = stringBuffer(param as string);
  } else if (param_type === 'null') {
    data_info = int64Buffer(0);
  } else if (param_type === 'object') {
    data_info = objectBuffer(param as object);
  } else if (param_type === 'ArrayBuffer') {
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
    data: data_info.data
  }
}

export class Chirp {
  private _version: number;
  private _command: string;
  private _paramGuideMap: ParamGuideMap;

  constructor (command: string) {
    this._version = 1;
    this._command = command;
    this._paramGuideMap = {};
  }

  public get version (): number {
    return this._version;
  }

  public get command (): string {
    return this._command;
  }

  public addParam (name: string, param: UnionTypesParam, numberLabel: UnionTypesNumberLabel): void {
    this._paramGuideMap[name] = convertParam(name, param, numberLabel);
  }

  public getParam (name: string): UnionTypesParam {
    if (this.hasParam(name)) {
      return this._paramGuideMap[name];
    } else {
      throw new Error(`invaild-param-name: ${name}`);
    }
  }

  public hasParam (name: string): boolean {
    return Object.prototype.hasOwnProperty.call(this._paramGuideMap, name);
  }

  public toDataView (): DataView {
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
    
    // 写入 tailer-pos
    const tailer_pos_view = new DataView(buffer, 0, BYTES_64BIT);
    tailer_pos_view.setBigInt64(0, BigInt(tailer_pos), true)

    // 写入所有的 params
    const param_view = new Uint8Array(buffer);
    for (const param_guide_with_data of param_guide_with_data_list) {
      param_view.fill(param_guide_with_data.data)
    }

    return view;
  }
}
