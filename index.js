const XJSON = require('bson').EJSON;
const Ajv = require('ajv');
const RefParser = require("@apidevtools/json-schema-ref-parser");

function clean(object, ...props) {
  props.forEach(prop => {
    Reflect.deleteProperty(object, prop);
  });
  return object;
}

class XCollection {
  constructor(mongodb, nameOrOptions, options) {
    let collectionName;
    let schema;

    if (typeof nameOrOptions === 'string') {
      collectionName = nameOrOptions;
      if (options && options.schema) schema = options.schema;
    } else if (nameOrOptions.$schema) {
      schema = nameOrOptions;
      collectionName = schema.name;
    } else if (nameOrOptions.schema) {
      options = nameOrOptions;
      collectionName = nameOrOptions.schema.name;
      schema = nameOrOptions.schema;
    }

    this.schema = schema;
    this.mongodb = mongodb;
    this.collection = (mongodb.db || mongodb).collection(collectionName, options || null);

    if (this.schema) {
      this.ajv = new Ajv({
        useDefaults: true,
        coerceTypes: true,
        allErrors: true,
      });
      this.schemaBundle = null;
    }
  }

  async validate(data) {
    if (!this.schema) return { valid: true };
    if (!this.schemaBundle) {
      this.schemaBundle = await RefParser.bundle(this.schema);
    }
    const validation = this.ajv.compile(this.schemaBundle);
    const isValid = validation(data);
    if (!isValid) {
      const error = new Error('VALIDATION_ERROR');
      error.errors = validation.errors;
      throw error;
    }
  }

  async xfunc(func, applyResult, ...args) {
    try {
      args = args.map(a => a ? this.convertInput(a) : undefined);
    } catch (error) {
      const newError = new Error(`[XCollection] Inputs conversion error`);
      newError.original = error.toString();
      newError.data = { id: args[0] };
      throw newError;
    }
    
    let result = null;
    try {
      result = await func.call(this.collection, args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
    } catch (error) {
      const newError = new Error(`[XCollection] Error calling func`);
      newError.original = error.toString();
      newError.data = { id: args[0] };
      throw newError;
    }

    let toConvert = null;
    try {
      toConvert = await (() => applyResult(result))();
    } catch (error) {
      const newError = new Error(`[XCollection] applyResult error`);
      newError.original = error.toString();
      newError.data = { id: args[0], result };
      throw newError;
    }

    let output = null;
    try {
      const isConvertible = (typeof toConvert === 'object') && (toConvert || null) !== null;
      output = isConvertible ? this.convertOutput(toConvert) : toConvert;
    } catch (error) {
      const newError = new Error(`[XCollection] Output conversion error`);
      newError.original = error.toString();
      newError.data = { id: args[0], result, toConvert };
      throw newError;
    }
    return output;
  }

  async op(opname, ...args) {
    const func = this.collection[opname];
    return this.xfunc(func, x => x, args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
  }

  async opx(opname, applyResult, ...args) {
    const func = this.collection[opname];
    return this.xfunc(func, applyResult, args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
  }

  convertInput(input) {
    return XJSON.parse(JSON.stringify(input));
  }

  convertOutput(input) {
    return JSON.parse(XJSON.stringify(input));
  }

  async aggregate(...args) { return this.opx('aggregate', x => x.toArray(), ...args); }
  async count(...args) { return this.op('count', ...args); }
  async find(...args) { return this.opx('find', x => x.toArray(), ...args); }
  async findOne(...args) { return this.op('findOne', ...args); }
  async insert(...args) {
    await this.validate(args[0]);
    return this.opx('insert', x => x.ops, ...args);
  }
  async insertOne(...args) {
    await this.validate(args[0]);
    return this.opx('insertOne', x => x.ops, ...args);
  }
  async insertMany(...args) {
    await this.validate(args[0]);
    return this.opx('insertMany', x => x.ops, ...args);
  }

  // TODO: validar updates (problema de ser apenas um patch ou objeto com operações $set,)
  async update(...args) { return this.opx('update', x => clean(x, 'result', 'connection'), ...args); }
  async updateMany(...args) { return this.opx('updateMany', x => clean(x, 'result', 'connection'), ...args); }
  async updateOne(...args) { return this.opx('updateOne', x => clean(x, 'result', 'connection'), ...args); }

  async deleteMany(...args) { return this.opx('deleteMany', x => clean(x, 'result', 'connection'), ...args); }
  async deleteOne(...args) { return this.opx('deleteOne', x => clean(x, 'result', 'connection'), ...args); }

}

module.exports = XCollection;
