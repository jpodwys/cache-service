# cache-service

A tiered caching solution for node.

If you are upgrading from older versions, please see the [Breaking Change History](#breaking-change-history) section.

If you use superagent from ajax calls, check out [superagent-cache](https://github.com/jpodwys/superagent-cache) to get superagent queries with cache-service built right in.

# What Does cache-service Do?

cache-service allows you to create redundant, cache-agnostic caching configurations. I've supplied a [redis wrapper](https://github.com/jpodwys/cache-service-redis) and [node-cache wrapper](https://github.com/jpodwys/cache-service-node-cache) as separate npm modules, but you can add any cache you want as long as you follow the [same interface](#cache-module-interface).

# Basic Usage

Require and instantiate cache-service as follows:

```javascript
var redisModule = require('cache-service-redis');
var cs = require('cache-service');

var redisCache = new redisModule();
var cacheService = new cs({}, [redisCache]);
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

# Standalone Cache Module Usage

When you pass a `cacheModuleConfig` to cache-service's constructor, it internally instantiates cache modules based on what data you provide. For example, the following `cacheModuleConfig` will internally instantiate a single nodeCacheModule instance with the given settings:

```javascript
[
  {
    type: 'node-cache',
    defaultExpiration: 60,
    cacheWhenEmpty: false
  }
]
```

But what if you want to manually instantiate your cache modules? There are several reason you might want to do this including:
* Having more testable code
* Knowing that a redis connection was successful before attempting to create a cache-service instance
* Having an external reference to a cache module without having to drill into cache-service's innards
* Injecting a custom cache module of your own creation (for example a mem-cache or a mongo cache module)
* Simply wanting to use a cache module and not cache-service (perhaps you like the extra convenience features like being able to add expirations to `.mset()` or built-in logging)

## Require, Instantiate, and Inject

#### Require
cache-service provides two native cache modules. A cache module is simply a wrapper for a cache type. The modules provided are for node-cache and redis. To require nodeCacheModule for manual instantiation, do the following:

```javascript
var nodeCacheModule = require('cache-service').nodeCacheModule;
```
#### Instantiate
To instantiate it, simply pass almost the same object we passed above in the `cacheModuleConfig` array as follows:

```javascript
var nodeCacheModuleInstance = new nodeCacheModule({
  //type is not necessary since we're instantiating a specific type manually
  defaultExpiration: 60,
  cacheWhenEmpty: false
}).cache;
```

#### Inject

Now let's pass our manually instantiated nodeCacheModuleInstance into our cache-service constructor:

```javascript
var cacheService = new cs({}, [
  {
    type: 'custom', //A type of 'custom' tells cache-service that this cache has already been instantiated
    cache: nodeCacheModuleInstance
  }
]);
```

# Cache Module Interface

Any cache can be used with cache-service as long as it follows the cacheModule interface. Whether you'd like to wrap your own cache for your app or make a pull request to add another cache type to this repo, your cache wrapper should follow the instructions below.

## Properties

Your cache wrapper must define the following top-level properties. Detailed descriptions for each of these can be found in the [Cache Module Configuration Object](#cache-module-configuration-object) documentation.

#### type
#### verbose
#### defaultExpiration

## Functions

Your cache wrapper must define any of the following top-level functions you plan to use. Detailed descriptions for each of these can be found in the [API](#api) documentation.

#### .get()
#### .mget()
#### .set()
#### .mset()
#### .del()
#### .flush()

## Usage

Once your cache meets the requirements listed above, you can follow the [Require, Instantiate, and Inject](#require-instantiate-and-inject) instructions to use it directly, or you can submit a [pull request](#pull-requests). Once your pull request is merged, you'll be able to have cache-service instantiate your cacheModule by simply passing the appropriate object into your [Cache Module Configuration Object](#cache-module-configuration-object).

## More Help

If this explanation doesn't cut it for you, have a look at [/modules/cacheModules/cacheModule.js](https://github.com/jpodwys/cache-service/blob/master/modules/cacheModules/cacheModule.js) and [/modules/cacheModules/nodeCacheModule.js](https://github.com/jpodwys/cache-service/blob/master/modules/cacheModules/nodeCacheModule.js) to see how I'm doing it.

# Pull Requests

To make a pull request to this repo, please

* Fork this repo
* Add your feature or bug fix
* Add comprehensive unit tests in my [test folder](https://github.com/jpodwys/cache-service/tree/master/test/server)
* Tag me (@jpodwys) and submit

# Breaking Change History

#### 1.1.0

cache-service has become more flexible and light-weight by no longer including cache modules directly within this repo. This means that you must now add any cache modules you want to use to your package.json and require and instantiate it yourself. cache-service will no longer accept a `cacheModuleConfig` object. That object has been replaced with the `cacheModules` object which is an array of pre-instantiated cache modules. These changes make it so that your app need not include cache modules you will not use. Thanks @nickdaugherty for the suggestion.

As a result of the above information, cache-service makes no assumptions and therefore provides you with no default configuration. This means that you must provide a cache module or cache-service will throw an exception.

#### 1.0.0

cache-service stores its caches in a top-level property called `cacheCollection`. Older versions of `cacheCollection` contained two arrays (`preApi` and `postApi`). In version 1.0.0, `cacheCollection` has been simplified by eliminating its `preApi` and `postApi` properties. This means that if you have any advanced references such as `cacheService.cacheCollection.preApi[0]`, you can simplify them to `cacheService.cacheCollection[0]`.
