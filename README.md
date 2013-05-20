#mongodb-schema-miner

Generate schemata from MongoDB collections

[![Build Status](https://travis-ci.org/aheckmann/mongodb-schema-miner.png)](https://travis-ci.org/aheckmann/mongodb-schema-miner)

##Use

```
$ npm install mongodb-schema-miner
```

```js
var miner = require('mongodb-schema-miner');
var uri = 'mongodb://someHost:port/database';

miner(uri, { collection: YOUR_COLLECTION_NAME }, function (err, schema) {
  console.log('my schema:', schema.toObject());

  // { _id: 'ObjectId',
  //   name: { last: 'String', first: 'String', meta: { number: 'Number' } },
  //   a: [ { x: 'Number', y: 'Number' } ],
  //   two: 'String',
  //   date: 'Date',
  //   oid: 'ObjectId',
  //   bin: 'Binary',
  //   int: 'Number',
  //   long: 'Long',
  //   mixed: 'Mixed',
  //   code: 'Code',
  //   docs: [ { _id: 'ObjectId', name: 'String' } ],
  //   strings: [ 'String' ],
  //   dates: [ 'Date' ],
  //   arrayOfArray: [ [ 'Number' ] ] }
})
```

By default the first 1000 documents are analyzed. Adjust the number of documents to analyze by setting the `limit` option:

```js
var options = {};
options.collection = YOUR_COLLECTION_NAME;
options.limit = 2500;

miner(uri, options, function (err, schema) {
  console.log('my schema:', schema.toObject());
})
```

Analyze specific fields:

```js
var options = {};
options.collection = YOUR_COLLECTION_NAME;
options.fields = { _id: 0, content: 1, created: 1 };

miner(uri, options, function (err, schema) {
  console.log('my schema:', schema.toObject());

  // { content: 'String'
  //   created: 'Date' }
})
```

Use a custom query to filter for documents you care about:

```js
var options = {};
options.collection = YOUR_COLLECTION_NAME;
options.query = { count: { $gt: 0 }};

miner(uri, options, function (err, schema) {
  console.log('my schema:', schema.toObject());

  // { _id: 'ObjectId',
  //   ..
  //   count: 'Number' }
})
```

Override the type returned by `mongodb-schema-miner`:

```js
var options = {};
options.collection = YOUR_COLLECTION_NAME;
options.onType = function (type) {
  if ('Code' == type) {
    return 'Function';
  }

  return type;
}

miner(uri, options, function (err, schema) {
  console.log('my schema:', schema.toObject());

  // { _id: 'ObjectId',
  //   ..
  //   code: 'Function' }
})
```

##License

[MIT](https://github.com/aheckmann/mongodb-schema-miner/blob/master/LICENSE)



