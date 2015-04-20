var expect = require('expect');
var ncModule = require('../../modules/cacheModules/nodeCacheModule');
var nodeCache = new ncModule().cache;

describe('Array', function(){
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
	});
});
