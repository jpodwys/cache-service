var cacheCollection = require('./cacheCollection');

/**
 * cacheService constructor
 * @constructor
 * @param cacheServiceConfig: {
 *   nameSpace:               {string | ''},
 *   verbose:                 {boolean | false},
 *   writeToVolatileCaches:   {boolean | true}
 * }
 * @param cacheModuleConfig: [
 *    {
 *      type:                 {string},
 *      defaultExpiration:    {integer | 900},
 *      cacheWhenEmpty:       {boolean | true},
 *      checkOnPreviousEmpty  {boolean | true},
 *      redisUrl:             {string},
 *      redisEnv:             {string},
 *      redisData: {
 *        port:       {integer},
 *        hostName:   {string},
 *        auth:       {string}
 *      }
 *    }
 * ]
 */
function cacheService(cacheServiceConfig, cacheModuleConfig) {
  var self = this;

  /**
   ******************************************* PUBLIC FUNCTIONS *******************************************
   */

  /**
   * Get the value associated with a given key
   * @param {string} key
   * @param {function} cb
   */
  self.get = function(key, cb){
    if(arguments.length < 2){
      throw new exception('INCORRECT_ARGUMENT_EXCEPTION', '.get() requires 2 arguments.');
    }
    log(false, 'get() called for key:', {key: key});
    var curCache;
    var curCacheIndex = 0;
    var callback = function(err, result){
      var status = checkCacheResponse(key, err, result, curCache.type, curCache.postApi, curCacheIndex - 1);
      if(status.status === 'continue'){
        if(status.toIndex){
          curCacheIndex = status.toIndex;
        }
        getNextCache();
        return;
      }
      if(status.status === 'break'){
        cb(err, status.result);
        if(self.writeToVolatileCaches){
          writeToVolatileCaches(curCacheIndex - 1, key, result);
        }
      }
      else {
        log(false, 'get() key not found:', {key: key});
        cb(null, null);
      }
    }
    function getNextCache(){
      if(curCacheIndex < self.cacheCollection.preApi.length){
        curCache = self.cacheCollection.preApi[curCacheIndex++];
        curCache.get(key, callback);
      }
    }
    getNextCache();
  }

  /**
   * Get multiple values given multiple keys
   * @param {array} keys
   * @param {function} cb
   */
  self.mget = function(keys, cb){
    if(arguments.length < 2){
      throw new exception('INCORRECT_ARGUMENT_EXCEPTION', '.mget() requires 2 arguments.');
    }
    log(false, 'MGetting keys:', {keys: keys});
    var maxKeysFound = 0;
    var returnError = null;
    var returnResponse = null;
    var keepGoing = true;
    var i = 0;
    var successIndex = 0;
    var finished = false;
    var finish = function(index){
      if(!finished){
        finished = true;
        keepGoing = false;
        writeToVolatileCaches(index, returnResponse);
        cb(returnError, returnResponse);
      }
    }
    var callback = function(err, response, index){
      var objectSize = 0;
      for(key in response){
        if(response.hasOwnProperty(key)){
          ++objectSize;
        }
      }
      if(objectSize === keys.length){
        returnResponse = response;
        finish(index);
      }
      else if(objectSize > maxKeysFound){
        maxKeysFound = objectSize;
        returnResponse = response;
        successIndex = index;
      }
      if(index + 1 === self.cacheCollection.preApi.length){
        returnResponse = response;
        finish(successIndex);
      }
    }
    while(keepGoing && i < self.cacheCollection.preApi.length){
      var cache = self.cacheCollection.preApi[i];
      cache.mget(keys, callback, i);
      i++;
    }
  }

  /**
   * Associate a key and value and optionally set an expiration
   * @param {string} key
   * @param {string | object} value
   * @param {integer} expiration
   * @param {function} cb
   */
  self.set = function(key, value, expiration, cb){
    if(arguments.length < 2){
      throw new exception('INCORRECT_ARGUMENT_EXCEPTION', '.set() requires a minimum of 2 arguments.');
    }
    for(var i = 0; i < self.cacheCollection.preApi.length; i++){
      var cache = self.cacheCollection.preApi[i];
      if(i === 0){
        cache.set(key, value, expiration, cb);
      }
      else{
        cache.set(key, value, expiration); 
      }
    }
    for(var i = 0; i < self.cacheCollection.postApi.length; i++){
      var cache = self.cacheCollection.postApi[i];
      if(i === 0){
        cache.set(key, value, expiration, cb);
      }
      else{
        cache.set(key, value, expiration); 
      }
    }
    log(false, 'Setting key and value:', {key: key, value: value});
  }

  /**
   * Associate multiple keys with multiple values and optionally set expirations per function and/or key
   * @param {object} arguments[0]
   * @param {integer} arguments[1]
   * @param {function} arguments[2]
   */
  self.mset = function(){
    if(arguments.length < 1){
      throw new exception('INCORRECT_ARGUMENT_EXCEPTION', '.mset() requires a minimum of 1 argument.');
    }
    var obj = arguments[0];
    var expiration = arguments[1] || null;
    var cb = arguments[2] || null;
    for(var i = 0; i < self.cacheCollection.preApi.length; i++){
      var cache = self.cacheCollection.preApi[i];
      expiration = expiration || cache.expiration;
      if(i === self.cacheCollection.preApi.length - 1){
        cache.mset(obj, expiration, cb);
      }
      else{
        cache.mset(obj, expiration);
      }
    }
    for(var i = 0; i < self.cacheCollection.postApi.length; i++){
      var cache = self.cacheCollection.postApi[i];
      if(i === self.cacheCollection.postApi.length - 1){
        cache.mset(obj, expiration, cb);
      }
      else{
        cache.mset(obj, expiration);
      }
    }
    log(false, 'MSetting obj:', {obj: obj});
  }

  /**
   * Delete a list of keys and their values
   * @param {array} keys
   * @param {function} cb
   */
  self.del = function(keys, cb){
    if(arguments.length < 1){
      throw new exception('INCORRECT_ARGUMENT_EXCEPTION', '.del() requires a minimum of 1 argument.');
    }
    for(var i = 0; i < self.cacheCollection.preApi.length; i++){
      var cache = self.cacheCollection.preApi[i];
      if(i === self.cacheCollection.preApi.length - 1){
        cache.del(keys, cb);
      }
      else{
        cache.del(keys);
      }
    }
    for(var i = 0; i < self.cacheCollection.postApi.length; i++){
      cache = self.cacheCollection.postApi[i];
      if(i === self.cacheCollection.postApi.length - 1){
        cache.del(keys, cb);
      }
      else{
        cache.del(keys);
      }
    }
    log(false, 'Deleting keys:', {keys: keys}); 
  }

  /**
   * Flush all keys and values from all configured caches in cacheCollection
   * @param {function} cb
   */
  self.flush = function(cb){
    for(var i = 0; i < self.cacheCollection.preApi.length; i++){
      var cache = self.cacheCollection.preApi[i];
      if(i === self.cacheCollection.preApi.length - 1){
        cache.flushAll(cb);
      }
      else{
        cache.flushAll();
      }
    }
    for(var i = 0; i < self.cacheCollection.postApi.length; i++){
      var cache = self.cacheCollection.postApi[i];
      if(i === self.cacheCollection.postApi.length - 1){
        cache.flushAll(cb);
      }
      else{
        cache.flushAll();
      }
    }
    log(false, 'Flushing all data');
  }

  /**
   ******************************************* PRIVATE FUNCTIONS *******************************************
   */

  /**
   * Initialize cacheService given the provided constructor params
   */
  function init(){
    if(!cacheServiceConfig) cacheServiceConfig = {};
    self.nameSpace = cacheServiceConfig.nameSpace || '';
    self.verbose = (typeof cacheServiceConfig.verbose === 'boolean') ? cacheServiceConfig.verbose : false;
    self.writeToVolatileCaches = (typeof cacheServiceConfig.writeToVolatileCaches === 'boolean') ? cacheServiceConfig.writeToVolatileCaches : true;
    self.cacheCollection = new cacheCollection({nameSpace: self.nameSpace, verbose: self.verbose}, cacheModuleConfig);
  }

  /**
   * Decides what action cacheService should take given the response from a configured cache
   * @param {string} key
   * @param {null | object} err
   * @param {null | object | string} result
   * @param {string} type
   * @param {boolean} isPostApi
   * @param {integer} cacheIndex
   */
  function checkCacheResponse(key, err, result, type, isPostApi, cacheIndex){
    if(err){
      log(true, 'Error when getting key ' + key + ' from cache with type ' + type + ':', err);
      if(i < self.cacheCollection.preApi.length - 1){
        return {status:'continue'};
      }
    }
    //THIS ALLOWS false AS A VALID CACHE VALUE, BUT DO I WANT null TO BE VALID AS WELL?
    if(result !== null && typeof result !== 'undefined'){
      log(false, 'Key found:', {key: key, value: result});
      return {status: 'break', result: result};
    }
    if(!isPostApi){
      var curCache = self.cacheCollection.preApi[cacheIndex];
      for(var i = cacheIndex + 1; i < self.cacheCollection.preApi.length; i++){
        var nextCache = self.cacheCollection.preApi[i];
        if(nextCache.checkOnPreviousEmpty || nextCache.expiration > curCache.expiration){
          return {status:'continue', toIndex: i};
        }
      }
    }
    return {status: 'else'};
  }

  /**
   * Writes data to caches that appear before the current cache in cacheCollection
   * @param {integer} currentCacheIndex
   * @param {string} key
   * @param {null | object | string} value
   */
  function writeToVolatileCaches(currentCacheIndex, key, value){
    if(currentCacheIndex > 0){
      var curExpiration = self.cacheCollection.preApi[currentCacheIndex].expiration;
      for(var tempIndex = currentCacheIndex; tempIndex > -1; tempIndex--){
        var preExpiration = self.cacheCollection.preApi[tempIndex].expiration;
        if(preExpiration <= curExpiration){
          var preCache = self.cacheCollection.preApi[currentCacheIndex];
          if(value){
            preCache.set(key, value); /*This means that a more volatile cache can have a key longer than a less volatile cache. Should I adjust this?*/
          }
          else if(typeof key === 'object'){
            preCache.mset(key);
          }
        }
      }
    }
  }

  /**
   * Instantates an exception to be thrown
   * @param {string} name
   * @param {string} message
   * @return {exception}
   */
  function exception(name, message){
    this.name = name;
    this.message = message;
  }

  /**
   * Logging utility function
   * @param {boolean} isError
   * @param {string} message
   * @param {object} data
   */
  function log(isError, message, data){
    var indentifier = 'cacheService: ';
    if(self.verbose || isError){
      if(data) console.log(indentifier + message, data);
      else console.log(indentifier + message);
    }
  }

  init();
}

module.exports = cacheService;
