var expect = require('expect');
var cs = require('../../cacheService');
var ncModule = require('cache-service-node-cache');
var nodeCache = new ncModule();
var rcModule = require('cache-service-redis');
var redisMock = require('redis-js');
var redisCache = new rcModule({redisMock: redisMock});
var cacheService = new cs({writeToVolatileCaches: false}, [
  redisCache,
  nodeCache
]);

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
    cacheService.set(key, value, 0.0001);
    setTimeout(function(){
      cacheService.get(key, function (err, response){
        expect(response).toBe(null);
        done();
      });
    }, 10);
  });

  it('.mset(obj), .mget(array) (exact key match)', function (done) {
    cacheService.mset({key: value, 'key2': 'value2', 'key3': 'value3'});
    cacheService.mget([key, 'key2', 'key3'], function (err, response){
      expect(response.key).toBe('value');
      expect(response.key2).toBe('value2');
      expect(response.key3).toBe('value3');
      done();
    });
  });

  it('.mset(obj), .mget(array) (not exact key match)', function (done) {
    cacheService.mset({key: value, 'key2': 'value2', 'key3': 'value3'});
    cacheService.mget([key, 'key2', 'key3', 'key4'], function (err, response){
      expect(response.key).toBe('value');
      expect(response.key2).toBe('value2');
      expect(response.key3).toBe('value3');
      expect(response.key4).toBe(undefined);
      done();
    });
  });

  it('.mset(obj, exp), .mget(array)', function (done) {
    cacheService.mset({key: value, 'key2': 'value2', 'key3': 'value3'}, 0.0001);
    setTimeout(function(){
      cacheService.mget([key, 'key2', 'key3', 'key4'], function (err, response){
        expect(response.key).toBe(undefined);
        expect(response.key2).toBe(undefined);
        expect(response.key3).toBe(undefined);
        expect(response.key4).toBe(undefined);
        done();
      });
    }, 10);
  });

  it('.mset(obj with expirations, exp), .mget(array) (exact key match)', function (done) {
    cacheService.mset({key: value, 'key2': {cacheValue: 'value2', expiration: 3}, 'key3': 'value3'}, 0.0001);
    setTimeout(function(){
      cacheService.mget([key, 'key2', 'key3'], function (err, response){
        expect(response.key).toBe(undefined);
        expect(response.key2).toBe('value2');
        expect(response.key3).toBe(undefined);
        expect(response.key4).toBe(undefined);
        done();
      });
    }, 10);
  });

  it('.mset(obj with expirations, exp), .mget(array) (not exact key match)', function (done) {
    this.timeout(10000);
    cacheService.mset({key: value, 'key2': {cacheValue: 'value2', expiration: 0.02}, 'key3': 'value3'}, 0.0001);
    setTimeout(function(){
      cacheService.mget([key, 'key2', 'key3', 'key4'], function (err, response){
        expect(response.key).toBe(undefined);
        expect(response.key2).toBe('value2');
        expect(response.key3).toBe(undefined);
        expect(response.key4).toBe(undefined);
        setTimeout(function(){
          cacheService.mget(['key2'], function (err, response){
            expect(response.key2).toBe(undefined);
            done();
          });
        }, 25);
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
    var caches = cacheService.caches;
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
    var firstCache = cacheService.caches[0];
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
  it('.mget() should return all available keys (exact key number match)', function (done) {
    cacheService.set(key, value);
    cacheService.set('key2', 'value2');
    cacheService.set('key3', 'value3');
    cacheService.mget([key, 'key2', 'key3'], function (err, response){
      expect(response.key).toBe('value');
      expect(response.key2).toBe('value2');
      expect(response.key3).toBe('value3');
      done();
    })
  });
  it('.mget() should return all available keys (not an exact key number match)', function (done) {
    cacheService.set(key, value);
    cacheService.set('key2', 'value2');
    cacheService.set('key3', 'value3');
    cacheService.mget([key, 'key2', 'key3', 'key4'], function (err, response){
      expect(response.key).toBe('value');
      expect(response.key2).toBe('value2');
      expect(response.key3).toBe('value3');
      expect(response.key4).toBe(undefined);
      done();
    })
  });
  it('Setting several keys via .mset() then calling .mget() should retrieve all keys (exact key number match)', function (done) {
    cacheService.mset({key: value, 'key2': 'value2', 'key3': 'value3'});
    cacheService.mget([key, 'key2', 'key3'], function (err, response){
      expect(response.key).toBe('value');
      expect(response.key2).toBe('value2');
      expect(response.key3).toBe('value3');
      done();
    })
  });
  it('Setting several keys via .mset() then calling .mget() should retrieve all keys (not an exact key number match)', function (done) {
    cacheService.mset({key: value, 'key2': 'value2', 'key3': 'value3'});
    cacheService.mget([key, 'key2', 'key3', 'key4'], function (err, response){
      expect(response.key).toBe('value');
      expect(response.key2).toBe('value2');
      expect(response.key3).toBe('value3');
      expect(response.key4).toBe(undefined);
      done();
    });
  });
});

describe('cachService performance tests (50ms added to all tests)', function () {
  var a = new ncModule();
  var b = new ncModule({defaultExpiration: 1600});
  var speedTest = new cs({}, [
    a,
    b
  ]);

  var list = {};
  var list2 = {};
  var list3 = [];
  var ITERATIONS = 50;
  for(var i = 0; i < ITERATIONS; ++i){
    list['key' + i] = 'value' + i;
    list2['key' + i + i] = 'value' + i + i;
    list3.push('key' + i + i);
  }

  beforeEach(function(){
    speedTest.flush();
    speedTest.mset(list2);
  });

  it('.set()  x 50', function (done) {
    for(var i = 0; i < ITERATIONS; ++i){
      speedTest.set('key' + i, 'value' + i, null, function(){
        if(i == ITERATIONS - 1){
          setTimeout(function(){
            done();
          }, 50);
        }
      });
    }
  });

  it('.mset() x 50', function (done) {
    speedTest.mset(list, null, function(){
      setTimeout(function(){
        done();
      }, 50);
    });
  });

  it('.get()  x 50', function (done) {
    for(var i = 0; i < ITERATIONS; ++i){
      speedTest.get('key' + i + i, function(){
        if(i == ITERATIONS - 1){
          setTimeout(function(){
            done();
          }, 50);
        }
      });
    }
  });

  it('.mget() x 50', function (done) {
    speedTest.mget(list3, function(){
      setTimeout(function(){
        done();
      }, 50);
    });
  });

});
