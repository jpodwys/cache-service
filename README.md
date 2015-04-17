# cache-service
A multi-tiered caching solution.

##What Does cache-service Do?
cache-service allows you to create redundant, cache-agnostic caching configurations. By default, it supports redis and node-cach, but you can add any cache you want as long as you follow the same interface.


##Why Would I Want Redundant Caching?
Let's say you want to store your most used data in an in-memory cache with a 5-minute expiration while storing a larger pool of data in a redis cache with a 15-minute expiration. You could easily do so on your own, but by using cache-service, you only have to execute one cache query to search both caches.

##Installation
```javascript
npm install cache-service
```

##Basic Usage
Require and instantiate cache-service as follows:
```javascript
var cs = require('cache-service').cacheService;
var cacheService = new cs();
```
##More Documentation Coming Soon