var expect = require('expect');
var cs = require('../../modules/cacheService');
var rMock = require('redis-mock');
var rcModule = require('../../modules/cacheModules/redisCacheModule');
var redisMock = rMock.createClient();
var redisCache = new rcModule({redisMock: redisMock}).cache;
var cacheService = new cs({}, [
  {type: 'custom', cache: redisCache},
  {type: 'node-cache', defaultExpiration: 1600}
  //{type: 'custom', cache: redisCache, defaultExpiration: 1800}
  //{type: 'node-cache', defaultExpiration: 1800}
]);

describe('Array', function(){

  var key = 'key';
  var value = 'value';

	beforeEach(function(){
		cacheService.flush();
	});

	describe('cachService API tests', function () {
  	it('.set(k, v), .get(k)', function (done) {
  		cacheService.set(key, value);
      cacheService.get(key, function (err, response){
        expect(response).toBe('value');
        done();
      });
    });
    it('.set(k, v, exp), .get(k)', function (done) {
      cacheService.set(key, value, 0.001);
      setTimeout(function(){
        cacheService.get(key, function (err, response){
          expect(response).toBe(null);
          done();
        });
      }, 10);
    });
    it('.del(string)', function (done) {
      cacheService.set(key, value);
      cacheService.del(key, function (err, count){
        expect(count).toBe(1);
        cacheService.get(key, function (err, response){
          expect(response).toBe(null);
          done();
        });
      });
    });
    it('.del(array)', function (done) {
      cacheService.set(key, value);
      cacheService.set('key2', 'value2');
      cacheService.del([key, 'key2'], function (err, count){
        expect(count).toBe(2);
        cacheService.get(key, function (err, response){
          expect(response).toBe(null);
          cacheService.get('key2', function (err, response){
            expect(response).toBe(null);
            done();
          });
        });
      });
    });
	});

  describe('cachService caching tests', function () {
    it('.set() should add data to all caches', function (done) {
      cacheService.set(key, value);
      var caches = cacheService.cacheCollection.preApi;
      for(var i = 0; i < caches.length; i++){
        var curCache = caches[i];
        curCache.get(key, function (err, response){
          expect(response).toBe(value);
        });
      }
      done();
    });
    it('.get(k) should search subsequent caches with longer default expirations when k is not found in earlier caches', function (done) {
      cacheService.set(key, value);
      var firstCache = cacheService.cacheCollection.preApi[0];
      firstCache.del(key, function (err, count){
        expect(count).toBe(1);
        firstCache.get(key, function (err, response){
          expect(response).toBe(null);
          cacheService.get(key, function (err, response){
            expect(response).toBe(value);
            done();
          });
        });
      });
    });
  });

});
