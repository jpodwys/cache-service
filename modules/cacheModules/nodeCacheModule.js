var cacheModule = require('./cacheModule');
var nodeCache = require('node-cache');

/**
 * nodeCacheModule constructor
 * @constructor
 * @param config: {
 *    type:                 {string | 'node-cache-standalone'}
 *    verbose:              {boolean | false},
 *    expiration:           {integer | 900},
 *    readOnly:             {boolean | false},
 *    checkOnPreviousEmpty  {boolean | true}
 * }
 */
function nodeCacheModule(config){

  config = config || {};
  this.cache = new cacheModule(config);

  /**
   * Initialize nodeCacheModule given the provided constructor params
   */
  this.cache.init = function(){
    try {
      this.db = new nodeCache();
      this.log(false, 'Node-cache client created with the following defaults:', {expiration: this.expiration, verbose: this.verbose, readOnly: this.readOnly});
    } catch (err) {
      this.log(true, 'Node-cache client not created:', err);
      this.db = false;
    }
    this.type = config.type || 'node-cache-standalone';
  }

  /**
   * Get the value associated with a given key
   * @param {string} key
   * @param {function} cb
   * @param {string} cleanKey
   */
  this.cache.get = function(key, cb, cleanKey){
    try {
      var cacheKey = (cleanKey) ? cleanKey : key;
      this.log(false, 'Attempting to get key:', {key: cacheKey});
      this.db.get(cacheKey, function(err, result){
        cb(err, result);
      });
    } catch (err) {
      cb({name: 'GetException', message: err}, null);
    }
  }

  /**
   * Get multiple values given multiple keys
   * @param {array} keys
   * @param {function} cb
   * @param {integer} index
   */
  this.cache.mget = function(keys, cb, index){
    this.log(false, 'Attempting to mget keys:', {keys: keys});
    this.db.mget(keys, function (err, response){
      cb(err, response, index);
    });
  }

  /**
   * Associate a key and value and optionally set an expiration
   * @param {string} key
   * @param {string | object} value
   * @param {integer} expiration
   * @param {function} cb
   */
  this.cache.set = function(key, value, expiration, cb){
    try {
      if(!this.readOnly){
        expiration = expiration || this.expiration;
        cb = cb || noop;
        this.db.set(key, value, expiration, cb);
      }
    } catch (err) {
      this.log(true, 'Set failed for cache of type ' + this.type, {name: 'NodeCacheSetException', message: err});
    }
  }

  /**
   * Associate multiple keys with multiple values and optionally set expirations per function and/or key
   * @param {object} obj
   * @param {integer} expiration
   * @param {function} cb
   */
  this.cache.mset = function(obj, expiration, cb){
    this.log(false, 'Attempting to mset data:', {data: obj});
    for(key in obj){
      if(obj.hasOwnProperty(key)){
        var tempExpiration = expiration || this.expiration;
        var value = obj[key];
        if(typeof value === 'object' && value.cacheValue){
          tempExpiration = value.expiration || tempExpiration;
          value = value.cacheValue;
        }
        this.db.set(key, value, tempExpiration);
      }
    }
    if(cb) cb();
  }

  /**
   * Flush all keys and values from all configured caches in cacheCollection
   * @param {function} cb
   */
  this.cache.flushAll = function(cb){
    try {
      this.db.flushAll();
      this.log(false, 'Flushing all data from cache of type ' + this.type);
    } catch (err) {
      this.log(true, 'Flush failed for cache of type ' + this.type, err);
    }
    if(cb) cb();
  }

  var noop = function(){}

  this.cache.init();
}

module.exports = nodeCacheModule;
