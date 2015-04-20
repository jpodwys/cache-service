# cache-service

A multi-tiered caching solution for node.

If you use superagent from node, check out [superagent-cache](https://github.com/jpodwys/superagent-cache) to get superagent queries with cache-service built right in.

## What Does cache-service Do?

cache-service allows you to create redundant, cache-agnostic caching configurations. By default, it supports redis and node-cach, but you can add any cache you want as long as you follow the same interface.

## Basic Usage

Require and instantiate cache-service as follows:

```javascript
var cs = require('cache-service').cacheService;
var cacheService = new cs();
```

This gives you the [default configuration](#what-does-the-default-configuration-give-me). Now you can cache like normal with the benefit of a tiered solution:

```javascript
function getData(key, cb){
  cacheService.getKey(key, function (err, response){
    if(!err){
      cb(err, response);
    }
    else{
      performQuery(key, function (err, response){
        var value = response.body.user;
        cacheService.setKey(key, value);
        cb(err, user);
      });
    }
  });
}
```

## Install

```javascript
npm install cache-service
```

## Run Tests

```javascript
npm test
```

## What Does the Default Configuration Give Me?

By following the [Basic Usage](basic-usage) example above, cache-service will:

* attempt to setup a primary redis cache connection (see the [constructor](constructor) section to see how to connect to redis)
* setup a node-cache instance that will act as a fallback cache if a redis cache connection is created and the primary and only cache if the redis cache connection is not created

All caches will have a [defaultExpiration](defaultexpiraiton) of 900 seconds unless specified otherwise.

## Constructor

cache-service's constructor takes two optional parameters in the following order: [cacheServiceConfig](cache-service-configuraiton-object) and [cacheModuleConfig](cache-module-configuration-object):

```javascript
var cacheService = new cs(cacheServiceConfig, cacheModuleConfig);
```

## Cache Service Configuration Object

#### nameSpace

A namespace to be applied to all keys generated for this instance of cache-service.

* type: string
* default: empty string

#### verbose

When false, cache-service will log only errors. When true, cache-service will log all activity (useful for testing and debugging).

* type: boolean
* default: false

#### writeToVolatileCaches

Let's say you have an instance of cache-service with two caches inside of it: cacheA and cacheB.  If cacheA has a shorter [defaultExpiration](defaultExpiration) than cacheB and cacheA does not have the key for which you're looking, cache-service will then look in cacheB. If cache-service finds the desired key in cacheB and `writeToVolatileCaches` is `true`, cache-service will then write that key to cacheA.

This is particularly useful if you want to have a short-term in-memory cache with the most used queries and a longer-term redis cache with all of the cached data.

* type: boolean
* default: true

## Cache Module Configuration Object

## API



##More Documentation Coming Soon
