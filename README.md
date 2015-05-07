# cache-service

A multi-tiered caching solution for node.

If you use superagent from node, check out [superagent-cache](https://github.com/jpodwys/superagent-cache) to get superagent queries with cache-service built right in.

# What Does cache-service Do?

cache-service allows you to create redundant, cache-agnostic caching configurations. By default, it supports redis and node-cach, but you can add any cache you want as long as you follow the same interface.

# Basic Usage

Require and instantiate cache-service as follows:

```javascript
var cs = require('cache-service').cacheService;
var cacheService = new cs();
```

This gives you the [default configuration](#what-does-the-default-configuration-give-me). Now you can cache like normal with the benefit of a tiered solution:

```javascript
function getData(key, cb){
  cacheService.get(key, function (err, response){
    if(!err){
      cb(err, response);
    }
    else{
      performQuery(key, function (err, response){
        var value = response.body.user;
        cacheService.set(key, value);
        cb(err, user);
      });
    }
  });
}
```

# Install

```javascript
npm install cache-service
```

# Run Tests

```javascript
npm test
```

# What Does the Default Configuration Give Me?

By following the [Basic Usage](basic-usage) example above, cache-service will:

* attempt to setup a primary redis cache connection (see the [constructor](constructor) section to see how to connect to redis)
* setup a node-cache instance that will act as a fallback cache if a redis cache connection is created and the primary and only cache if the redis cache connection is not created

All caches will have a [defaultExpiration](defaultexpiraiton) of 900 seconds unless specified otherwise.

# Constructor

cache-service's constructor takes two optional parameters in the following order: [cacheServiceConfig](cache-service-configuraiton-object) and [cacheModuleConfig](cache-module-configuration-object):

```javascript
var cacheService = new cs(cacheServiceConfig, cacheModuleConfig);
```

# Cache Service Configuration Object

This is where you set cache-service-level config options.

## nameSpace

A namespace to be applied to all keys generated for this instance of cache-service.

* type: string
* default: empty string

## verbose

When false, cache-service will log only errors. When true, cache-service will log all activity (useful for testing and debugging).

* type: boolean
* default: false

## writeToVolatileCaches

Let's say you have an instance of cache-service with two caches inside of it: cacheA and cacheB.  If cacheA has a shorter [defaultExpiration](#defaultexpiration) than cacheB and cacheA does not have the key for which you're looking, cache-service will then look in cacheB. If cache-service finds the desired key in cacheB and `writeToVolatileCaches` is `true`, cache-service will then write that key to cacheA.

This is particularly useful if you want to have a short-term in-memory cache with the most used queries and a longer-term redis cache with all of the cached data.

* type: boolean
* default: true

# Cache Module Configuration Object

This is where you tell cache-service which caches you want and how you want them configured. Here is an example cacheModuleConfig:

```javascript
var cacheModuleConfig = [
  {
    type: 'node-cache',
    defaultExpiration: 300,
    cacheWhenEmpty: false
  },
  {
    type: 'redis',
    redisEnv: 'REDISCLOUD_URL',
    defaultExpiration: 900,
    cacheWhenEmpty: false
  }
]
```
This config would attempt to create a primary node-cache instance with a fallback redis cache. The node-cache instance would have a 5-minute defaultExpiration and the redis instance would have a 15-minute default expiraiton.

Here are all the available options:

## type

This is the type of cache you want to use. Currently, the only options are 'redis', 'node-cache', and 'custom'. If you choose 'redis' or 'node-cache', cache-service will create an instance of that cache type for you using the assiciated config options. If you choose 'custom', you can pass in your own cache instance and it will work as long as you match the [Cache Module Interface](#cache-module-interface).

If you need external access to a redis or node-cache instance, you can instantiate a cache-module and then pass it as a 'custom' cache. See [Standalone Cache Module Usage](#standalone-cache-module-usage) for more info.

* type: string

## redisData (only for use with `type` 'redis')

This is the most generic way to pass in your redis configuraiton options.

* type: object

#### Example

```javascript
var redisData = {
  port: myRedisPort,
  hostname: myRedisHostname,
  auth: myRedisAuth
}
```

## redisUrl (only for use with `type` 'redis')

If you have all of your redis params already prepared as a URL in the following format: `http://uri:password@hostname:port`, then you can simply pass that URL with the object key `redisUrl`.

* type: string

## redisEnv (only for use with `type` 'redis')

If you have a redis URL contained in an env variable (in process.env[redisEnv]), cache-service can retrieve it for you if you pass the env variable name with the object key `redisEnv`.

* type: string

## defaultExpiration

The expiration to include when executing cache set commands. Can be overridden via `.set()`'s optional expiraiton param.

* type: int
* default: 900
* measure: seconds

## checkOnPreviousEmpty

By default, if two subsequent caches have the same `defaultExpiraiton`, the second of the two caches will be checked in the event that the first cache does not have a key. If `checkOnPreviousEmpty` is `false`, cache-service will not check subsequent caches with the same `defaultExpiration`.

* type: boolean
* default: true

## readOnly

Whether a cache should not be written to. Useful if you're sharing a redis cache with another team and your contract with them is that you will not alter their data.

* type: boolean
* default: false

## postApi (Currently not implemented)

Only for use with [superagent-cache](https://github.com/jpodwys/superagent-cache). Whether this cache should be evaluated only in the event of an API failure. This is useful when you want to have an extremely long-term cache to serve data when an API is down. Currently, only the first cache module with postApi set to true will be used.

* type: boolean
* default: false

# API

## .get(key, callback (err, response))

Retrieve a value by a given key.

* key: type: string
* callback: type: function
* err: type: object
* response: type: string or object

## .mget(keys, callback (err, response))

Retrieve the values belonging to a series of keys. If a key is not found, it will not be in `response`.

* keys: type: an array of strings
* callback: type: function
* err: type: object
* response: type: object, example: {key: 'value', key2: 'value2'...}

## .set(key, value [, expiraiton, callback])

Set a value by a given key.

* key: type: string
* callback: type: function
* expiration: type: int, measure: seconds
* callback: type: function

## .mset(obj [, callback])

Set multiple values to multiple keys

* obj: type: object, example: {'key': 'value', 'key2': 'value2'...}
* callback: type: function

## .del(keys [, callback (err, count)])

Delete a key or an array of keys and their associated values.

* keys: type: string || array of strings
* callback: type: function
* err: type: object
* count: type: int

## .flush()

Flush all keys and values from an instance of cache-service.
