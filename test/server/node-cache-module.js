var expect = require('expect');
var ncModule = require('../../modules/cacheModules/nodeCacheModule');
var nodeCache = new ncModule().cache;

var key = 'key';
var value = 'value';

beforeEach(function(){
	nodeCache.flushAll();
});

describe('nodeCacheModule Tests', function () {
	it('Getting absent key should return null', function (done) {
		nodeCache.get(key, function (err, result){
			expect(result).toBe(null);
			done();
		});
  });
  it('Setting then getting key should return value', function (done) {
		nodeCache.set(key, value);
		nodeCache.get(key, function (err, result) {
			expect(result).toBe(value);
			done();
		});
  });
  it('Setting then deleting then getting key should return null', function (done) {
		nodeCache.set(key, value);
		nodeCache.del(key);
		nodeCache.get(key, function (err, result) {
			expect(result).toBe(null);
			done();
		});
  });
  it('Setting several keys then calling .flushAll() should remove all keys', function (done) {
		nodeCache.set(key, value);
		nodeCache.set('key2', 'value2');
		nodeCache.set('key3', 'value3');
		var keyCount = nodeCache.db.getStats().keys;
		expect(keyCount).toBe(3);
		nodeCache.flushAll();
		var keyCount = nodeCache.db.getStats().keys;
		expect(keyCount).toBe(0);
		done();
  });
  it('Setting several keys then calling .mget() should retrieve all keys', function (done) {
    nodeCache.set(key, value);
    nodeCache.set('key2', 'value2');
    nodeCache.set('key3', 'value3');
    nodeCache.mget([key, 'key2', 'key3', 'key4'], function (err, response){
      expect(response.key).toBe('value');
      expect(response.key2).toBe('value2');
      expect(response.key3).toBe('value3');
      expect(response.key4).toBe(undefined);
      done();
    });
  });
  it('Setting several keys via .mset() then calling .mget() should retrieve all keys', function (done) {
    nodeCache.mset({key: value, 'key2': 'value2', 'key3': 'value3'});
    nodeCache.mget([key, 'key2', 'key3', 'key4'], function (err, response){
      expect(response.key).toBe('value');
      expect(response.key2).toBe('value2');
      expect(response.key3).toBe('value3');
      expect(response.key4).toBe(undefined);
      done();
    });
  });
});
