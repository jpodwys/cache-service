# cache-service

A tiered caching solution for JavaScript.

Upgrading from an older version? Please see the [Breaking Change History](#breaking-change-history) section.

Do you use [superagent](https://visionmedia.github.io/superagent/)? Check out [superagent-cache](https://github.com/jpodwys/superagent-cache) to get superagent queries with cache-service built right in.

# What Does cache-service Do?

cache-service allows you to create redundant, cache-agnostic caching configurations. I've supplied a [redis wrapper](https://github.com/jpodwys/cache-service-redis) and [node-cache wrapper](https://github.com/jpodwys/cache-service-node-cache) as separate npm modules, but you can add any cache you want as long as you follow the [same interface](#cache-module-interface).

# Basic Usage

Require and instantiate cache-service as follows:

```javascript
var cs = require('cache-service');
var cacheService = new cs();
```

This gives you the [default configuration](#what-does-the-default-configuration-give-me). Now you can cache like normal with the benefit of a tiered solution:

```javascript
function getData(key, cb){
  cacheService.get(key, function (err, response){
    if (err) { // err is truthy if an actual error occurred
      cb(err);
    }
    if(response) { // response is null when there's no cache response
      cb(err, response);
    } else { // response contains the value if the cache hits
      performQuery(key, function (err, response){
        var value = response.body.user;
        cacheService.set(key, value);
        cb(err, value);
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

# What Does the Default Configuration Give Me?

By following the [Basic Usage](basic-usage) example above, cache-service will:

* use all the default values shown in the [Cache Service Configuration Object](#cache-service-configuration-object) section
* provide you with an instance of [cacheModule](https://github.com/jpodwys/cache-service-cache-module)

All caches will have a [defaultExpiration](defaultexpiraiton) of 900 seconds unless specified otherwise.

# How Do I Use a Custom Configuration?

To use a custom configuraiton, take advantage of the the two optional params you can hand to `cache-service`'s [constructor](#constructor) as follows:

```javascript
//Require the desired modules (make sure to add them to your package.json)
var nodeCacheModule = require('cache-service-node-cache');
var redisModule = require('cache-service-redis');
var cs = require('cache-service');

//Instantiate your cache modules
var nodeCache = new nodeCacheModule({defaultExpiration: 500});
var redisCache = new redisModule({redisEnv: 'REDISCLOUD_URL'});

//Setup your cache-service constructor params
var cacheServiceConfig = {verbose: true};
var cacheModules = [nodeCache, redisCache];

//Instantiate cache-service
var cacheService = new cs(cacheServiceConfig, cacheModules);
```

This code block will result in a tiered `cache-service` instance that uses a primary in-memory cache and a fallback redis cache. For more information on what cache modules are available, see the [Available Cache Modules](#available-cache-modules) section.

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
  nodeCacheInstance
  redisCacheInstance
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

Retrieve a value by a given key. All [available cache modules](#available-cache-modules) attempt to `JSON.parse` all values returned from `.get()` and `JSON.stringify` all values passed to `.set()`.

* key: type: string
* callback: type: function
* err: type: object
* response: type: string or object, null on cache miss

## .mget(keys, callback (err, response))

Retrieve the values belonging to a series of keys. If a key is not found, it will not be in `response`.

* keys: type: an array of strings
* callback: type: function
* err: type: object
* response: type: object, example: {key: 'value', key2: 'value2'...}

## .set(key, value, [expiraiton], [refresh(key, cb)], [callback])

> See the [Using Background Refresh](#using-background-refresh) section for more about the `refresh` and `callback` params.

Set a value by a given key. All [available cache modules](#available-cache-modules) attempt to `JSON.stringify` all values passed to `.set()` and `JSON.parse` all values returned from `.get()`.

> IMPORTANT: The `callback` param takes precedence over the `refresh` param. This means that, when only four arguments are passed and the last param is a function, `cache-service` will assume the last param is `callback`. Similarly, if three params are passed and the third is a function, `cache-service` will assume the third param is `callback` rather than `refresh`. This is done to maintain backwards compatibility with versions released before the `background refresh` feature was added.

* key: type: string
* callback: type: function
* expiration: type: int, measure: seconds
* refresh: type: function
* callback: type: function

## .mset(obj, [expiration], [callback])

Set multiple values to multiple keys

* obj: type: object, example: {'key': 'value', 'key2': 'value2', 'key3': {cacheValue: 'value3', expiration: 60}}
* callback: type: function

This function exposes a heirarchy of expiration values as follows:
* The `expiration` property of a key that also contains a `cacheValue` property will override all other expirations. (This means that, if you are caching an object, the string 'cacheValue' is a reserved property name within that object.)
* If an object with both `cacheValue` and `expiration` as properties is not present, the `expiration` provided to the `.mset()` argument list will be used.
* If neither of the above is provided, each cache's `defaultExpiration` will be applied.

## .del(keys, [callback (err, count)])

Delete a key or an array of keys and their associated values.

* keys: type: string || array of strings
* callback: type: function
* err: type: object
* count: type: int

## .flush([cb])

Flush all keys and values from an instance of cache-service.

* callback: type: function

## .caches

> IMPORTANT: While this property is available for viewing, modifying it at run time will almost certainly break cache-service.

This is the `cacheModules` array you passed as the second param to the constructor.

# Using Background Refresh

With a typical cache setup, you're left to find the perfect compromise between having a long expiration so that users don't have to suffer through the worst case load time, and a short expiration so data doesn't get stale. `cache-service` eliminates the need to worry about users suffering through the longest wait time by automatically refreshing keys for you.

#### How do I turn it on?

By default, background refresh is off. It will turn itself on the first time you pass a `refresh` param to `.set()`.

#### Setup

`cache-service` relies on the background refresh feature of the final cache you pass in the `cacheModules` array. When you call `.set()` and pass `refresh` and `callback` params, `cache-service` routes the provided `refresh` param to ONLY the final cache in the `cacheModules` array. This means that you almost certainly want `cache-service`'s `writeToVolatileCaches` property set to `true` (it defaults to `true`) so that the refresh written to the final cache will propogate forward to earlier caches

#### Configure

If desired, configure the following properties in the final cache in the `cacheModules` array:

* `backgroundRefreshInterval`
* `backgroundRefreshMinTtl`
* `backgroundRefreshIntervalCheck`

#### Use

Background refresh is exposed via the `.set()` command as follows:

```javascript
cacheModule.set('key', 'value', 300, refresh, cb);
```

If you want to pass `refresh`, you must also pass `cb` because if only four params are passed, `cache-service-node-cache` will assume the fourth param is `cb`.

#### The Refresh Param

###### refresh(key, cb(err, response))

* key: type: string: this is the key that is being refreshed
* cb: type: function: you must trigger this function to pass the data that should replace the current key's value

The `refresh` param MUST be a function that accepts `key` and a callback function that accepts `err` and `response` as follows:

```javascript
var refresh = function(key, cb){
  var response = goGetData();
  cb(null, response);
}
```

# Available Cache Modules

#### cache-service-redis

A redis wrapper for cache-service or standalone use. [Available on NPM](https://github.com/jpodwys/cache-service-redis).

#### cache-service-node-cache

An in-memory cache wrapper for cache-service or standalone use. [Available on NPM](https://github.com/jpodwys/cache-service-node-cache).

#### cache-service-cache-module

A super-light in-memory cache for cache-service or standalone use. (This module is bundled with `cache-service` and provided in the default configuration if you do not provide a `cacheModules` constructor param.) [Available on NPM](https://github.com/jpodwys/cache-service-cache-module).

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
#### .db (Not a function--see the API)

## Usage

Once your cache meets the requirements listed above, you can follow the [Install, Require, Instantiate, and Inject](#install-require-instantiate-and-inject) instructions to use it directly.

## More Help

If this explanation doesn't cut it for you, have a look at [cache-service-cache-module](https://github.com/jpodwys/cache-service-cache-module/blob/master/cacheModule.js), [cache-service-node-cache](https://github.com/jpodwys/cache-service-node-cache/blob/master/nodeCacheModule.js), and [cache-service-redis](https://github.com/jpodwys/cache-service-node-cache/blob/master/redisCacheModule.js) to see how I'm doing it.

# Cache Module Naming Convention

If you decide to create an open-source cache module for use with cache-service, please start your module name with 'cache-service-' so that people can find it easily.

# Pull Requests

To make a pull request to this repo, please

* Fork this repo
* Add your feature or bug fix
* Add comprehensive unit tests in my [test folder](https://github.com/jpodwys/cache-service/tree/master/test/server)
* Tag me (@jpodwys) and submit

# Breaking Change History

#### 1.2.0

* With this release, you must use the following releases of each of the following cache modules to avoid a conflict with `.flush()`:
  * cache-service-cache-module: >= 1.0.0
  * cache-service-node-cache: >= 1.0.1
  * cache-service-redis: >= 1.0.1
* The default configuration returns! And this time, it's better than ever. (Not really a breaking change, but worth noting, since I removed this feature in `1.1.0`). My goal was to accomidate two user groups:
  * The ones who want zero bloat--don't bundle cache modules I'm not going to use
  * The ones who know nothing about external cache modules and just want to get caching
In order to satisfy both groups, I built a brand new, bare-bones, in-memory cache module called [cacheModule](https://github.com/jpodwys/cache-service-cache-module). It has no external dependencies and matches `cache-service`'s complete API. Unminified and with comments, the module's JavaScript file is 165 lines. It will be injected into `cacheService.caches` if no `cacheModules` constructor param is provided.

#### 1.1.0

* cache-service has become more flexible and light-weight by no longer including cache modules directly within this repo. This means that you must now add any cache modules you want to use to your package.json and require and instantiate them yourself. cache-service will no longer accept a `cacheModuleConfig` object as the second param in its constructor. That object has been replaced with the `cacheModules` array which is an array of pre-instantiated cache modules. These changes make it so that your app need not include cache modules you will not use. Thanks @nickdaugherty for the suggestion.
* As a result of the above information, cache-service makes no assumptions and therefore provides you with no default configuration. This means that you must provide a cache module in the `cacheModules` array or cache-service will throw an exception.
* For the sake of brevity, `cacheService.cacheCollection` is now `cacheService.caches`.

#### 1.0.0

cache-service stores its caches in a top-level property called `cacheCollection`. Older versions of `cacheCollection` contained two arrays (`preApi` and `postApi`). In version 1.0.0, `cacheCollection` has been simplified by eliminating its `preApi` and `postApi` properties. This means that if you have any advanced references such as `cacheService.cacheCollection.preApi[0]`, you can simplify them to `cacheService.cacheCollection[0]`.

#### 0.2.8

Prior to this version, a complete `.mget()` miss (meaning that zero of the passed keys were found) returned `null`. Starting with this version, the same scenario returns an empty object.
