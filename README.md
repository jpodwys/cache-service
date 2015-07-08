# cache-service

A tiered caching solution for JavaScript.

Upgrading from an older version? Please see the [Breaking Change History](#breaking-change-history) section.

Do you use [superagent](https://visionmedia.github.io/superagent/)? Check out [superagent-cache](https://github.com/jpodwys/superagent-cache) to get superagent queries with cache-service built right in.

# What Does cache-service Do?

cache-service allows you to create redundant, cache-agnostic caching configurations. I've supplied a [redis wrapper](https://github.com/jpodwys/cache-service-redis) and [node-cache wrapper](https://github.com/jpodwys/cache-service-node-cache) as separate npm modules, but you can add any cache you want as long as you follow the [same interface](#cache-module-interface).

# Basic Usage

Require and instantiate cache-service as follows:

```javascript
var redisModule = require('cache-service-redis');
var cs = require('cache-service');

var redisCache = new redisModule({redisEnv: 'REDISCLOUD_URL'});
var cacheService = new cs({}, [redisCache]);
```

Now you can cache like normal with the benefit of a tiered solution:

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
npm install cache-service --save
```

# Run Tests

```javascript
npm test
```

# Constructor

cache-service's constructor takes two parameters in the following order: [cacheServiceConfig](cache-service-configuraiton-object) and [cacheModules](cache-modules-array):

```javascript
var cacheService = new cs(cacheServiceConfig, cacheModules);
```

# Cache Service Configuration Object

This is where you set cache-service-level config options. Here are all the available options:

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

# Cache Modules Array

This is where you give cache-service the pre-instantiated caches you want it to use. Here's an example `cacheModules` array:

```javascript
//Instantiate some cache modules
var nodeCacheInstance = new nodeCacheModule({defaultExpiration: 500});
var redisCacheInstance = new redisCacheModule({redisEnv: 'REDISCLOUD_URL'});

//Place the new cache modules into the cacheModules array
var cacheModules = [
  redisCacheInstance,
  nodeCacheInstance
]
```
This `cacheModules` array will provide a primary node-cache instance with a fallback redis cache. The node-cache instance would have a 500-second defaultExpiration and the redis instance would have a 15-minute default expiraiton.

# Cache Module Configuration Object

As you can see in the [Cache Modules Array](#cache-modules-array) example above, each cache module constructor takes an object. This object is a `cacheModuleConfig` object. I've added a more explicit example below for clarity:

```javascript
var cacheModuleConfig = {defaultExpiration: 500, readOnly: true};
var cacheModule = new nodeCacheModule(cacheModuleConfig);
var cacheModules = [cacheModule];
```

Every cache module, regardless of the type of cache its wrapping, accepts a `cacheModuleConfig` in its constructor. While the properties accepted by a given cache module's `cacheModuleConfig` may vary, the properties listed below should always be available in all cache modules. If you need to know what unique `cacheModuleConfig` properties a specific cache module accepts, visit that cache module's documentation.

## type

An arbitrary identifier you can assign so you know which cache is responsible for logs and errors.

* type: string
* default: the name of the cache type ('redis' or 'node-cache' etc.)

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

## .mset(obj [, expiration, callback])

Set multiple values to multiple keys

* obj: type: object, example: {'key': 'value', 'key2': 'value2', 'key3': {cacheValue: 'value3', expiration: 60}}
* callback: type: function

This function exposes a heirarchy of expiration values as follows:
* The `expiration` property of a key that also contains a `cacheValue` property will override all other expirations. (This means that, if you are caching an object, the string 'cacheValue' is a reserved property name within that object.)
* If an object with both `cacheValue` and `expiration` as properties is not present, the `expiration` provided to the `.mset()` argument list will be used.
* If neither of the above is provided, each cache's `defaultExpiration` will be applied.

## .del(keys [, callback (err, count)])

Delete a key or an array of keys and their associated values.

* keys: type: string || array of strings
* callback: type: function
* err: type: object
* count: type: int

## .flush(cb)

Flush all keys and values from an instance of cache-service.

* callback: type: function

# Available Cache Modules

#### cache-service-redis

A redis wrapper for cache-service or standalone use. [Available on NPM](https://github.com/jpodwys/cache-service-redis).

#### cache-service-node-cache

An in-memory cache wrapper for cache-service or standalone use. [Available on NPM](https://github.com/jpodwys/cache-service-node-cache).

# Using Cache Modules

## Install, Require, Instantiate, and Inject

#### Install
cache-service allows you to inject any cache type that matches the [Cache Module Interface](#cache-module-interface). Any such modules should be stored in a separate NPM package so that you can include exactly what you need in your app and nothing more. I've provided a [redis wrapper as an NPM module](https://www.npmjs.com/package/cache-service-redis), so let's use that one for the purposes of these examples. To install a cache module, locate the cache-service-compatible package you want to use (we'll use `cache-service-redis`), then install it as follows:

```javascript
npm install cache-service-redis --save
```

#### Require
Now that you've installed the cache modules you want, go ahead and require them in your project:

```javascript
var redisCacheModule = require('cache-service-redis');
```
#### Instantiate
To instantiate it, simply pass a [Cache Module Configuration](#cache-module-configuration) object:

```javascript
var redisCacheInstance = new nodeCacheModule({
  redisEnv: 'REDISCLOUD_URL',
  defaultExpiration: 60,
  cacheWhenEmpty: false
});
```

#### Inject

Now let's pass our manually instantiated redisCacheInstance into our cache-service constructor:

```javascript
var cacheService = new cs({}, [
  redisCacheInstance
]);
```

# Cache Module Interface

Any cache can be used with cache-service as long as it follows the cacheModule interface. Whether you'd like to wrap your own cache for your app or create a new NPM module so everyone can benefit from your work, your cache wrapper should follow the instructions below.

## Properties

Your cache wrapper must define the following top-level properties. Detailed descriptions for each of these can be found in the [Cache Module Configuration Object](#cache-module-configuration-object) documentation.

#### type
#### verbose
#### defaultExpiration

## Functions

Your cache wrapper must define any of the following top-level functions you plan to use. Detailed descriptions for each of these can be found in the [API](#api) documentation. (If you're making an open-source package rather than just using your custom cache wrapper on your own, please include all functionality.)

#### .get()
#### .mget()
#### .set()
#### .mset()
#### .del()
#### .flush()

## Usage

Once your cache meets the requirements listed above, you can follow the [Install, Require, Instantiate, and Inject](#install-require-instantiate-and-inject) instructions to use it directly.

## More Help

If this explanation doesn't cut it for you, have a look at [cache-service-node-cache](https://github.com/jpodwys/cache-service-node-cache/blob/master/nodeCacheModule.js) and [cache-service-redis](https://github.com/jpodwys/cache-service-node-cache/blob/master/redisCacheModule.js) to see how I'm doing it.

# Cache Module Naming Convention

If you decide to create an open-source cache module for use with cache-service, please start your module name with 'cache-service-' so that people can find it easily.

# Pull Requests

To make a pull request to this repo, please

* Fork this repo
* Add your feature or bug fix
* Add comprehensive unit tests in my [test folder](https://github.com/jpodwys/cache-service/tree/master/test/server)
* Tag me (@jpodwys) and submit

# Breaking Change History

#### 1.1.0

* cache-service has become more flexible and light-weight by no longer including cache modules directly within this repo. This means that you must now add any cache modules you want to use to your package.json and require and instantiate them yourself. cache-service will no longer accept a `cacheModuleConfig` object as the second param in its constructor. That object has been replaced with the `cacheModules` array which is an array of pre-instantiated cache modules. These changes make it so that your app need not include cache modules you will not use. Thanks @nickdaugherty for the suggestion.
* As a result of the above information, cache-service makes no assumptions and therefore provides you with no default configuration. This means that you must provide a cache module in the `cacheModules` array or cache-service will throw an exception.
* For the sake of brevity, `cacheService.cacheCollection` is now `cacheService.caches`.

#### 1.0.0

cache-service stores its caches in a top-level property called `cacheCollection`. Older versions of `cacheCollection` contained two arrays (`preApi` and `postApi`). In version 1.0.0, `cacheCollection` has been simplified by eliminating its `preApi` and `postApi` properties. This means that if you have any advanced references such as `cacheService.cacheCollection.preApi[0]`, you can simplify them to `cacheService.cacheCollection[0]`.
