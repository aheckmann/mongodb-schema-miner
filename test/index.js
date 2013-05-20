
var mine = require('../')
var assert = require('assert')
var mongodb = require('mongodb');

var uri = 'mongodb://localhost/mongodb-schema-miner';
var collection = 'users';

describe('mongodb-schema-miner', function(){

  before(function(done){
    var docs = [];
    docs.push({"name":{last:"Heckmann",first:"aaron"}});
    docs.push({"name":{meta:{number: 3.492}}})
    docs.push({a:[{x:3}, {y:0}]})
    docs.push({one:"one"})
    docs.push({one:{x:"cool"}})
    docs.push({two: "two"})
    docs.push({two: "it"})
    docs.push({two: "is"})
    docs.push({date: new Date, oid: new mongodb.ObjectID})
    docs.push({date: new Date('01-24-1977')})
    docs.push({bin: new Buffer(1), int: 3, long: new mongodb.Long(234234, 33939393) })
    docs.push({min: new mongodb.MinKey, max: new mongodb.MaxKey });
    docs.push({docs:[
        {_id:new mongodb.ObjectID, name: 'aaron'}
      , {_id:new mongodb.ObjectID, name: 'rachel'}
    ]});
    docs.push({mixdocs:[
        {_id:new mongodb.ObjectID, name: 'aaron'}
      , {_id:4, name: 'rachel'}
    ]});
    docs.push({ code: new mongodb.Code('3 + 3') });
    docs.push({ code: new mongodb.Code('3 + 3', { x: 1 }) });
    docs.push({ strings:['ye','per'], dates:[new Date] })
    docs.push({ strings:[], dates:[] })
    docs.push({ strings:[String('eeeeee')], dates:[new Date] })
    docs.push({ arrayOfArray: [[3],[47],[1,2,null,4]] })
    docs.push({ arrayOfArrayOfArray: [[['y']],[[null,'y'],[]],[]] })
    docs.push({ arrayOfMixed: [] })
    docs.push({ arrayOfMixed: [3] })
    docs.push({ arrayOfMixed: [/asdf/] })
    docs.push({ deep: [] })
    docs.push({ deep: [{_id: new mongodb.ObjectID }] })
    docs.push({ deep: [null, {_id: new mongodb.ObjectID }] })
    docs.push({ deep: [{x: 47 }] })
    docs.push({ deep: [null, {y: new Date }, null] })
    docs.push({ deep: [{y: new Date, z: { aa: [{yes:[{its:'nested'}]}] } }] })
    docs.push({ deep: [{y: new Date, z: { aa: [{yes:[{its:'really nested', reg: new RegExp('asdf','i') }]}] } }] })
    docs.push({ deep: [{y: new Date, z: { aa: [{yes:[{its:'really nested', reg: /asd/ }]}] } }] })
    docs.push({ deep: [{y: new Date, z: { aa: [{yes:[{its:'really nested', reg: null, a: {} }]}] } }] })
    docs.push({ deep: [{y: new Date, z: { aa: [{yes:[{its:'really nested', a: 3 }]}] } }] })

    mongodb.connect(uri, function (err, db) {
      db.collection(collection).insert(docs, function (err) {
        if (err) return done(err);
        db.close(done);
      });
    })
  })

  after(function(done){
    mongodb.connect(uri, function (err, db) {
      db.dropDatabase(function () {
        db.close(done)
      })
    })
  })

  it('works', function(done){
    var opts = {
        collection: 'users'
    };

    mine(uri, opts, function (err, schema) {
      assert.ifError(err);

      var o = schema.toObject();

      assert.equal('ObjectId', o._id);
      assert.equal('String', o.name.first);
      assert.equal('String', o.name.last);
      assert.equal('Number', o.name.meta.number);
      assert.equal('Number', o.a[0].x);
      assert.equal('Number', o.a[0].y);
      assert.equal('Mixed', o.one);
      assert.equal('String', o.two);
      assert.equal('Date', o.date);
      assert.equal('ObjectId', o.oid);
      assert.equal('Binary', o.bin);
      assert.equal('Long', o.long);
      assert.equal('Number', o.int);
      assert.equal('Mixed', o.min);
      assert.equal('Mixed', o.max);
      assert.equal('ObjectId', o.docs[0]._id);
      assert.equal('String', o.docs[0].name);
      assert.equal('Mixed', o.mixdocs[0]._id);
      assert.equal('String', o.mixdocs[0].name);
      assert.equal('Code', o.code);
      assert.deepEqual(['String'], o.strings);
      assert.deepEqual(['Date'], o.dates);
      assert.deepEqual([['Number']], o.arrayOfArray);
      assert.deepEqual([[['String']]], o.arrayOfArrayOfArray);
      assert.deepEqual(['Mixed'], o.arrayOfMixed);
      assert.deepEqual([{ _id: 'ObjectId',
         x: 'Number',
         y: 'Date',
         z: { aa: [{ yes: [
                   { its: 'String', reg: 'RegExp', a: 'Mixed' }]}
            ]}
      }], o.deep);

      done();
    })
  })

  it('works with custom query', function(done){
    var opts = {
        collection: 'users'
      , query: { dates: { $exists: true }}
    };

    mine(uri, opts, function (err, schema) {
      assert.ifError(err);

      var o = schema.toObject();

      assert.equal(3, Object.keys(o).length);
      assert.equal('ObjectId', o._id);
      assert.deepEqual(['Date'], o.dates);
      assert.deepEqual(['String'], o.strings);

      done();
    })
  })

  it('allows override of types', function(done){
    function onType (type) {
      return 'Binary' == type
        ? 'Buffer'
        : type;
    }

    var opts = {
        collection: 'users'
      , query: { bin: { $exists: true }}
      , onType: onType
    };

    mine(uri, opts, function (err, schema) {
      assert.ifError(err);
      var o = schema.toObject();
      assert.equal('Buffer', o.bin);
      done();
    })
  })


  it('supports field syntax', function(done){
    var opts = {
        collection: 'users'
      , fields: { 'name.first': 1, _id: 0 }
    };

    mine(uri, opts, function (err, schema) {
      assert.ifError(err);

      var o = schema.toObject();

      assert.equal(1, Object.keys(o).length);
      assert.ok(!o._id);
      assert.equal('String', o.name.first);
      assert.equal(undefined, o.name.last);

      done();
    })
  })
})
