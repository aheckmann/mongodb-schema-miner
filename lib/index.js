
var mongodb = require('mongodb')
var Schema = require('./schema')
var debug = require('debug')('mongodb-schema-miner');

// default options
var options = { server: { poolSize: 1 }};

/**
 * schema minor api
 */

module.exports = exports = function miner (uri, opts, cb) {
  var collection = opts.collection;
  validate(uri, collection, cb);

  debug('connecting to ' + uri);

  mongodb.connect(uri, options, function (err, db) {
    if (err) return cb(err);

    debug('connected');
    debug('streaming documents from ' + collection + ' collection');

    var query = opts.query || {};
    var limit = opts.limit || 1000;
    var fields = opts.fields || {};

    var stream = db.collection(collection).find(query, fields).limit(limit).stream();
    read(stream, opts, db, cb);
  })
}

/**
 * process documents from the stream
 */

function read (stream, opts, db, cb) {
  var schema = new exports.Schema;

  if (opts.onType) {
    schema.onType = opts.onType;
  }

  stream.once('error', function (err) {
    debug('aborting with error: ' + err);
    db.close(cb.bind(err));
  });

  stream.on('data', function (doc) {
    var err = schema.consume(doc);
    if (err) return abort(err, stream, db, cb);
  })

  stream.on('end', function () {
    debug('db closing');
    db.close(function () {
      debug('db closed');
      cb(null, schema);
    })
  })
}

/**
 * abort the stream
 */

function abort (err, stream, db, cb) {
  debug('aborting with error: ' + err);
  stream.destroy();
  db.close(function () {
    cb(err);
  })
}

/**
 * validate "miner" arguments
 */

function validate (uri, collection, cb) {
  if ('function' != typeof cb) {
    throw new TypeError('cb must be a function');
  }

  if ('string' != typeof collection) {
    throw new TypeError('collection must be a string');
  }

  if ('string' != typeof uri) {
    throw new TypeError('uri must be a string');
  }
}

/**
 * expose schema constructor
 */

exports.Schema = Schema;

