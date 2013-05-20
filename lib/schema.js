
var mongodb = require('mongodb')
var isObject = require('./isObject')

module.exports = exports = Schema;

function Schema (doc) {
  this.schema = {};
  if (doc) this.consume(doc);
}

/**
 * Analyze `doc` adding any additional properties to
 * this structure. If unresolvable conflicts are detected
 * an error will be returned, otherwise `undefined`.
 *
 * @param {Object} doc
 * @return {Error|undefined}
 */

Schema.prototype.consume = function (doc) {
  try {
    merge(this.schema, doc, this);
  } catch (err) {
    return err;
  }
}

/**
 * Merge an object into schema
 */

function merge (schema, doc, self) {
  var keys = Object.keys(doc);

  for (var i = 0; i < keys.length; ++i) {
    var key = keys[i];
    var type;

    // if nothing in schema yet, just assign
    if ('undefined' == typeof schema[key]) {
      var type = self.getType(doc, key);
      if (undefined !== type) {
        schema[key] = type;
      }
      continue;
    }

    // exists in schema and incoming is an object?
    if (isObject(doc[key])) {
      if (isObject(schema[key])) {
        merge(schema[key], doc[key], self);

      } else {
        type = self.getType(doc, key);
        if (undefined !== type) {
          if ('null' == schema[key]) {
            schema[key] = type;
          } else if (type != schema[key]) {
            schema[key] = 'Mixed';
          }
        }
      }
    } else {
      // exists in schema and incoming is not an object.
      var type = self.getType(doc, key);
      if (undefined === type) {
        continue;
      }

      if ('null' == schema[key]) {
        schema[key] = type;

      } else if ('null' == type) {
        // ignore

      } else if (Array.isArray(schema[key]) && Array.isArray(type)) {

        if (0 === schema[key].length) {
          schema[key] = type;

        } else if (schema[key][0] instanceof Schema && isObject(type[0])) {
          // merge schemas
          schema[key][0].combine(type[0]);

        } else if (!equalType(schema[key], type)) {
          schema[key] = ['Mixed'];
        }

      } else if (!equalType(schema[key], type)) {
        schema[key] = 'Mixed';
      }
    }
  }
}

/**
 * Combines two schemas
 */

Schema.prototype.combine = function (schema) {
  combine(this.schema, schema.schema);
}

function combine (existing, other) {
  var keys = Object.keys(other);

  for (var i = 0; i < keys.length; ++i) {
    var key = keys[i];

    if ('undefined' == typeof existing[key]) {
      existing[key] = other[key];
      continue;
    }

    if ('null' == other[key]) {
      continue;
    }

    if (Array.isArray(existing[key]) && Array.isArray(other[key])) {
      if (0 === existing[key].length) {
        existing[key] = other[key];
        continue;
      }

      if ('null' == other[key][0] || 0 === other[key].length) {
        // ignore
        continue;
      }

      if (existing[key][0] instanceof Schema && other[key][0] instanceof Schema) {
        existing[key][0].combine(other[key][0]);
        continue;
      }

      if (existing[key][0] != other[key][0]) {
        existing[key] = ['Mixed'];
        continue;
      }
    } // end if arrays

    if (isObject(existing[key]) && isObject(other[key])) {
      combine(existing[key], other[key]);
      continue;
    }

    if (existing[key] != other[key]) {
      existing[key] = 'Mixed';
    }
  }
}

/**
 * Returns the type for obj[prop]
 */

Schema.prototype.getType = function (obj, prop) {
  var type = getType(obj, prop, this);
  return this.onType(type);
}

/**
 * An overridable filter for modifying returned types
 */

Schema.prototype.onType = function (type) {
  return type;
}

/**
 * Determines the type of obj[prop]
 */

function getType (obj, prop, self) {
  var val = obj[prop];
  var type = typeof val;

  if (null == val) {
    return 'null';
  }

  if (Buffer.isBuffer(val) || val instanceof mongodb.Binary) {
    return 'Binary';
  }

  if (Array.isArray(val)) {
    if (val.length > 0) {
      return getArrayType(val, self);
    }
    return [];
  }

  if (val instanceof mongodb.ObjectID) {
    return 'ObjectId';
  }

  if (val instanceof mongodb.Long) {
    return 'Long';
  }

  if (val instanceof mongodb.Double) {
    return 'Double';
  }

  if (val instanceof mongodb.Code) {
    return 'Code';
  }

  if (val instanceof mongodb.DBRef) {
    return 'DBRef';
  }

  if (val instanceof mongodb.Timestamp) {
    return 'Timestamp';
  }

  if (val instanceof mongodb.MinKey ||
      val instanceof mongodb.MaxKey) {
    return 'Mixed';
  }

  if (val instanceof mongodb.Symbol) {
    return 'Symbol';
  }

  if (val instanceof Date) {
    return 'Date';
  }

  if (val instanceof RegExp) {
    return 'RegExp';
  }

  val = val.valueOf();
  type = typeof val;

  if ('string' == type) {
    return 'String';
  }

  if ('number' == type) {
    return 'Number';
  }

  if ('boolean' == type) {
    return 'Boolean';
  }

  if ('object' != type) {
    throw new Error('dunno what to do with ' + val);
  }

  var ret = {};
  var keys = Object.keys(val);

  if (0 === keys.length) {
    return ret;
  }

  for (var i = 0; i < keys.length; ++i) {
    var key = keys[i];
    ret[key] = self.getType(val, key);
  }

  return ret;
}

/**
 * Determines if two types are equal
 */

function equalType (a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (0 === a.length || 0 === b.length) {
      return true;
    }

    return equalType(a[0], b[0]);
  }

  if ('null' == a || 'null' == b) {
    return true;
  }

  return a == b;
}

/**
 * Determine the type of array
 *
 * example return vals:
 *
 *   ['Mixed']
 *   ['Buffer']
 *   [{ name: 'String', count: 'Number' }]
 *
 */

function getArrayType (arr, self) {
  var compareDocs = false;
  var type = self.getType(arr, 0);

  if (isObject(type)) {
    type = new Schema(arr[0]);
    compareDocs = true;
  }

  var match = true;
  var element;
  var err;

  for (var i = 1; i < arr.length; ++i) {
    element = arr[i];

    if (isObject(element)) {
      if (compareDocs) {
        err = type.consume(element);
        if (err) throw err;
        continue;
      }

      if ('null' == type) {
        type = new Schema(element);
        compareDocs = true;
        continue;
      }

      match = false;
      break;
    }

    if (!equalType(self.getType(arr, i), type)) {
      match = false;
      break;
    }
  }

  if (match) return [type];
  return ['Mixed'];
}

/**
 * Convert this to plain object
 *
 * @return {Object}
 */

Schema.prototype.toObject = function (parent) {
  return convertObject(this.schema, parent || this);
}

/**
 * Converts an object containing schemas to a plain object
 */

function convertObject (schema, self) {
  var keys = Object.keys(schema);
  var ret = {};

  for (var i = 0; i < keys.length; ++i) {
    var key = keys[i];
    ret[key] = convertElement(schema[key], self);
  }

  return ret;
}

/**
 * Converts a single element to plain object
 */

function convertElement (el, self) {
  if (el instanceof Schema) {
    return el.toObject(self);
  }

  if (isObject(el)) {
    return convertObject(el, self);
  }

  if (Array.isArray(el)) {
    return el.map(function (item) {
      return convertElement(item, self);
    })
  }

  return el;
}

