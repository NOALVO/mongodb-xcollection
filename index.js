const XJSON = require('mongodb-extjson');

class XCollection {
  constructor(mongodb, name, options) {
    let collectionName;
    let schema;

    if (typeof name === 'string') {
      collectionName = name;
    } else if (name) {
      options = name;
      schema = JSON.parse(JSON.stringify(options.schema));
      collectionName = schema.name;
      delete options.schema;
    }

    this.schema = schema;
    this.mongodb = mongodb;
    this.collection = (mongodb.db || mongodb).collection(collectionName, options || null);
  }

  async xfunc(func, applyResult, ...args) {
    args = args.map(a => a ? this.convertInput(a) : undefined);
    const result = await func.call(this.collection, args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
    const toConvert = await (() => applyResult(result))();
    return this.convertOutput(toConvert);
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
  async findOne(...args) { return this.op('find', ...args); }
  async insert(...args) { return this.opx('insert', x => x.ops, ...args); }
  async insertOne(...args) { return this.opx('insertOne', x => x.ops, ...args); }
  async insertMany(...args) { return this.opx('insertMany', x => x.ops, ...args); }
  async update(...args) { return this.opx('update', x => x.ops, ...args); }
  async updateMany(...args) { return this.opx('updateMany', x => x.ops, ...args); }
  async updateOne(...args) { return this.opx('updateOne', x => x.ops, ...args); }

}

module.exports = XCollection;
