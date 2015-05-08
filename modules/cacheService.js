var cacheCollection = require('./cacheCollection');

function cacheService(cacheServiceConfig, cacheModuleConfig) {
  var self = this;

  self.init = function(){
    if(!cacheServiceConfig) cacheServiceConfig = {};
    self.nameSpace = cacheServiceConfig.nameSpace || '';
    self.verbose = (typeof cacheServiceConfig.verbose === 'boolean') ? cacheServiceConfig.verbose : false;
    self.writeToVolatileCaches = (typeof cacheServiceConfig.writeToVolatileCaches === 'boolean') ? cacheServiceConfig.writeToVolatileCaches : true;
    self.cacheCollection = new cacheCollection({nameSpace: self.nameSpace, verbose: self.verbose}, cacheModuleConfig);
  }

  self.get = function(key, cb){
    self.log(false, 'get() called for key:', {key: key});
    var curCache;
    var curCacheIndex = 0;
    var cacheGetCallback = function(err, result){
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
        self.log(false, 'get() key not found:', {key: key});
        cb(null, null);
      }
    }
    function getNextCache(){
      if(curCacheIndex < self.cacheCollection.preApi.length){
        curCache = self.cacheCollection.preApi[curCacheIndex++];
        curCache.get(key, cacheGetCallback);
      }
    }
    getNextCache();
  }

  self.mget = function(keys, cb){
    self.log(false, 'MGetting keys:', {keys: keys});
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
    var cacheMgetCallback = function(err, response, index){
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
        finish(successIndex);
      }
    }
    while(keepGoing && i < self.cacheCollection.preApi.length){
      cache = self.cacheCollection.preApi[i];
      cache.mget(keys, cacheMgetCallback, i);
      i++;
    }
  }

  self.set = function(key, value, expiration, cb){
    for(var i = 0; i < self.cacheCollection.preApi.length; i++){
      cache = self.cacheCollection.preApi[i];
      if(i === 0){
        cache.set(key, value, expiration, cb);
      }
      else{
        cache.set(key, value, expiration); 
      }
    }
    for(var i = 0; i < self.cacheCollection.postApi.length; i++){
      cache = self.cacheCollection.postApi[i];
      if(i === 0){
        cache.set(key, value, expiration, cb);
      }
      else{
        cache.set(key, value, expiration); 
      }
    }
    self.log(false, 'Setting key and value:', {key: key, value: value});
  }

  self.mset = function(){
    var obj;
    var expiration;
    var cb;
    if(arguments.length === 3){
      obj = arguments[0];
      expiraiton = arguments[1] || null;
      cb = arguments[2];
    }
    else if(arguments.length === 2){
      obj = arguments[0];
      expiraiton = null;
      cb = arguments[1];
    }
    for(var i = 0; i < self.cacheCollection.preApi.length; i++){
      cache = self.cacheCollection.preApi[i];
      expiration = expiration || cache.expiration;
      if(i === self.cacheCollection.preApi.length - 1){
        cache.mset(obj, expiration, cb);
      }
      else{
        cache.mset(obj, expiration);
      }
    }
    for(var i = 0; i < self.cacheCollection.postApi.length; i++){
      cache = self.cacheCollection.postApi[i];
      if(i === self.cacheCollection.postApi.length - 1){
        cache.mset(obj, expiration, cb);
      }
      else{
        cache.mset(obj, expiration);
      }
    }
    self.log(false, 'MSetting obj:', {obj: obj});
  }

  self.del = function(keys, cb){
    for(var i = 0; i < self.cacheCollection.preApi.length; i++){
      cache = self.cacheCollection.preApi[i];
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
    self.log(false, 'Deleting keys:', {keys: keys}); 
  }

  self.flush = function(){
    for(var i = 0; i < self.cacheCollection.preApi.length; i++){
      cache = self.cacheCollection.preApi[i];
      if(i === self.cacheCollection.preApi.length - 1){
        cache.flushAll();
      }
      else{
        cache.flushAll();
      }
    }
    for(var i = 0; i < self.cacheCollection.postApi.length; i++){
      cache = self.cacheCollection.postApi[i];
      if(i === self.cacheCollection.postApi.length - 1){
        cache.flushAll();
      }
      else{
        cache.flushAll();
      }
    }
    self.log(false, 'Flushing all data');
  }

  self.log = function (isError, message, data){
    var indentifier = 'cacheService: ';
    if(self.verbose || isError){
      if(data) console.log(indentifier + message, data);
      else console.log(indentifier + message);
    }
  }

  function checkCacheResponse(key, err, result, type, isPostApi, cacheIndex){
    if(err){
      self.log(true, 'Error when getting key ' + key + ' from cache with type ' + type + ':', err);
      if(i < self.cacheCollection.preApi.length - 1){
        return {status:'continue'};
      }
    }
    //THIS ALLOWS false AS A VALID CACHE VALUE, BUT DO I WANT null TO BE VALID AS WELL?
    if(result !== null && typeof result !== 'undefined'){
      self.log(false, 'Key found:', {key: key, value: result});
      return {status: 'break', result: result};
    }
    //console.log('LOG', !isPostApi)
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

  function exception(name, message){
    this.name = name;
    this.message = message;
  }

  self.init();
}

module.exports = cacheService;