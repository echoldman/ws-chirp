type UnionTypesNumberLabel = string | null;
type UnionTypesData = DataView | null;

interface ParamGuide {
  name: string;
  type: string;
  pos: number;
  len: number;
  numberLabel: UnionTypesNumberLabel;
  data: UnionTypesData;
}

interface Tailer {
  version: number;
  command: string;
  paramGuides: Array<ParamGuide>;
}

/**
 * |--------------------------------------------------------------------------|
 * | boolean          | int8          | 1 to true, 0 to false                 |
 * | number: int32    | int32         | int32 value                           |
 * | number: uint32   | uint32        | uint32 value                          |
 * | number: float32  | float32       | float32 value                         |
 * | number: float64  | float64       | float64 value                         |
 * | string           | ArrayBuffer   | string to ArrayBuffer                 |
 * | null             | int8          | always to be 0                        |
 * | object           | ArrayBuffer   | object to json-string to ArrayBuffer  |
 * | DataView         | ArrayBuffer   | DataView.buffer                       |
 * | -------------------------------------------------------------------------|
 */

type UnionTypesParam = boolean | number | string | null | object | DataView;

interface ParamGuideMap {
  [key: string]: ParamGuide;
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
  } else if (prototype_string === '[object DataView') {
    return 'DataView';
  } else {
    throw new Error('the-param-is-invalid-type')
  }
}

function convertParam (name: string, param: UnionTypesParam, numberLabel: UnionTypesNumberLabel): ParamGuide {
  const param_guide: ParamGuide = {
    name: name,
    type: getParamTypeString(param),
    pos: 0,
    len: 0,
    numberLabel: null,
    data: null
  }

  if (param_guide.type === 'boolean') {
    param_guide.len = 1;
  } else if (param_guide.type === 'number') {
    if (numberLabel === 'int32') {
      param_guide.len = 4;
    } else if (numberLabel === 'uint32') {
      param_guide.len = 4;
    } else if (numberLabel === 'float32') {
      param_guide.len = 4;
    } else if (numberLabel === 'float64') {
      param_guide.len = 8;
    } else {
      throw new Error(`invalid-number-label: ${numberLabel}`)
    }
  } else if (param_guide.type === 'string') {
    // TODO: 转换 string 到 ArrayBuffer
  } else if (param_guide.type === 'null') {
    param_guide.len = 1;
  } else if (param_guide.type === 'object') {
    // TODO: 转换 object 串到 ArrayBuffer
  } else if (param_guide.type === 'DataView') {
    param_guide.len = (param as DataView).byteLength
  }

  return param_guide
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
    const param_guides: Array<ParamGuide> = [];

    /* 计算总长度 */

    // Tailer Pos 字节长度 
    const length_tailer_pos = 4;

    // 所有 Param 需要的长度
    let length_all_data = 0;
    for (const name in Object.keys(this._paramGuideMap)) {
      const param_guide: ParamGuide = this._paramGuideMap[name];
      param_guide.pos = length_all_data;
      param_guides.push(param_guide)
      length_all_data = length_all_data + param_guide.len
    }

    // TODO: 计算总和并合并为 ArrayBuffer
  }
}
