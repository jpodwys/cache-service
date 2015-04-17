var expect = require('expect');
var rMock = require('redis-mock');
var rcModule = require('../../modules/cacheModules/redisCacheModule');
var redisMock = rMock.createClient();
var redisCache = new rcModule({redisMock: redisMock}).cache;

describe('Array', function(){
	var key = 'key';
	var value = 'value';

	beforeEach(function(){
		redisCache.flushAll();
	});

	describe('redisCacheModule Tests', function () {
  	it('Getting absent key should return null', function (done) {
  		redisCache.get(key, function (err, result){
  			expect(result).toBe(null);
  			done();
  		});
    });
    it('Setting then getting key should return value', function (done) {
      redisCache.set(key, value);
      redisCache.get(key, function (err, result) {
        expect(result).toBe(value);
        done();
      });
    });
    it('Setting then deleting then getting key should return null', function (done) {
      redisCache.set(key, value);
      redisCache.delete(key);
      redisCache.get(key, function (err, result) {
        expect(result).toBe(null);
        done();
      });
    });
    it('Setting several keys then calling .flushAll() should remove all keys', function (done) {
      redisCache.set(key, value);
      redisCache.set('key2', 'value2');
      redisCache.set('key3', 'value3');
      redisCache.db.keys('*', function (err, keys){
        var keyCount = keys.length;
        expect(keyCount).toBe(3);
        redisCache.flushAll();
        redisCache.db.keys('*', function (err, keys){
          keyCount = keys.length;
          expect(keyCount).toBe(0);
          done();
        });
      });
    });
	});
});
