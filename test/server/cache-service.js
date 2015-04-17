var expect = require('expect');
var cs = require('../../modules/cacheService');
var rMock = require('redis-mock');
var rcModule = require('../../modules/cacheModules/redisCacheModule');
var redisMock = rMock.createClient();
var redisCache = new rcModule({redisMock: redisMock}).cache;
var cacheService = new cs({}, [
  {type: 'custom', cache: redisCache},
  {type: 'node-cache', defaultExpiration: 1600},
  {type: 'node-cache', defaultExpiration: 1800}
]);

describe('Array', function(){

  var key = 'key';
  var value = 'value';

	beforeEach(function(){
		cacheService.flushKeys();
	});

	describe('cachService API tests', function () {
  	it('.setKey(k, v), .getKey(k)', function (done) {
  		cacheService.setKey(key, value);
      cacheService.getKey(key, function (err, response){
        expect(response).toBe('value');
        done();
      });
    });
    it('.setKey(k, v, exp), .getKey(k)', function (done) {
      cacheService.setKey(key, value, 0.001);
      setTimeout(function(){
        cacheService.getKey(key, function (err, response){
          expect(response).toBe(null);
          done();
        });
      }, 10);
    });
    it('.deleteKeys(string)', function (done) {
      cacheService.setKey(key, value);
      cacheService.deleteKeys(key, function (err, count){
        expect(count).toBe(1);
        cacheService.getKey(key, function (err, response){
          expect(response).toBe(null);
          done();
        });
      });
    });
    it('.deleteKeys(array)', function (done) {
      cacheService.setKey(key, value);
      cacheService.setKey('key2', 'value2');
      cacheService.deleteKeys([key, 'key2'], function (err, count){
        expect(count).toBe(2);
        cacheService.getKey(key, function (err, response){
          expect(response).toBe(null);
          cacheService.getKey('key2', function (err, response){
            expect(response).toBe(null);
            done();
          });
        });
      });
    });
	});

  describe('cachService caching tests', function () {
    it('.setKey() should add data to all caches', function (done) {
      cacheService.setKey(key, value);
      var caches = cacheService.cacheCollection.preApi;
      for(var i = 0; i < caches.length; i++){
        var curCache = caches[i];
        curCache.get(key, function (err, response){
          expect(response).toBe(value);
        });
      }
      done();     
    });
    it('.getKey(k) should search subsequent caches with longer default expirations when k is not found in earlier caches', function (done) {
      cacheService.setKey(key, value);
      var firstCache = cacheService.cacheCollection.preApi[0];
      firstCache.delete(key, function (err, count){
        expect(count).toBe(1);
        firstCache.get(key, function (err, response){
          expect(response).toBe(null);
          cacheService.getKey(key, function (err, response){
            expect(response).toBe(value);
            done();
          });
        });
      });
    });
  });

});
