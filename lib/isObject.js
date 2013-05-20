
var toString = Object.prototype.toString;

function isObject (v) {
  return '[object Object]' == toString.call(v);
}

module.exports = isObject;
