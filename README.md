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

This gives you the [default configuration](#what-does-the-default-configuration-give-me?). Now you can cache like normal with the benefit of a tiered solution:

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

* attempt to setup a primary redis cache connection (see the API section under [constructor](constructor) to see how to connect to redis)
* setup a node-cache instance that will act as a fallback cache if a redis cache connection is created and the primary and only cache if the redis cache connection is not created

All caches will have a [defaultExpiration](defaultexpiraiton) of 900 seconds unless specified otherwise.

##More Documentation Coming Soon
