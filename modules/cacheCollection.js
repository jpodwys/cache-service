var cacheModule = require('./cacheModules/cacheModule');
var redisCacheModule = require('./cacheModules/redisCacheModule');
var nodeCacheModule = require('./cacheModules/nodeCacheModule');

function cacheCollection(cacheModuleConfig){
	var self = this;
	self.supportedCaches = ['redis', 'node-cache', 'custom'];

	self.init = function(){
		if(cacheModuleConfig && !isEmpty(cacheModuleConfig)){
      self.cacheModuleConfig = cacheModuleConfig;
    }
    else{
      self.cacheModuleConfig = [{type: 'redis'}, {type: 'node-cache'}];
    }
    self.preApi = [];
    self.postApi = [];

    for(var i = 0; i < self.cacheModuleConfig.length; i++){
      var cacheConfig = validateCacheConfig(self.cacheModuleConfig[i]);
      if(cacheConfig.postApi && self.postApi.length > 0){
        continue;
      }
      var cache = null;
      if(cacheConfig.type != 'custom'){
        try {
          cache = getCacheModule(cacheConfig).cache;
        } catch (err) {
          self.log(true, 'Failed to get requested cache module with config ' + JSON.stringify(cacheConfig) + ' :', err);
        }
        if(cache && cache.db){
          var preOrPostApi = (!cacheConfig.postApi) ? 'preApi' : 'postApi';
          self[preOrPostApi].push(cache);
        }
      }
      else{
        var preOrPostApi = (!cacheConfig.postApi) ? 'preApi' : 'postApi';
        self[preOrPostApi].push(self.cacheModuleConfig[i].cache);
      }
    }
    if(self.preApi.length < 1){
      throw new exception('NoCacheException', 'No pre-api caches were succesfully initialized.');
    }
	}

	function validateCacheConfig(cacheConfig){
    if(!cacheConfig.type || self.supportedCaches.indexOf(cacheConfig.type) < 0){
      throw new exception('BadCacheTypeException', 'You either did not set a cache type or you spelled it wrong.');
    }
    if(cacheConfig.type != 'custom'){
      cacheConfig.nameSpace = self.nameSpace;
      cacheConfig.verbose = self.verbose;
    }
    return cacheConfig;
  }

  function getCacheModule(cacheConfig){
    if(cacheConfig.type === 'redis'){
      return new redisCacheModule(cacheConfig);
    }
    else if(cacheConfig.type === 'node-cache'){
      return new nodeCacheModule(cacheConfig);
    }
  }

	function isEmpty (val) {
    return (val === false || val === null || (typeof val == 'object' && Object.keys(val).length == 0));
  }



	self.init();
}

module.exports = cacheCollection;