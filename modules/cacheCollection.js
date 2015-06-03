var cacheModule = require('./cacheModules/cacheModule');
var redisCacheModule = require('./cacheModules/redisCacheModule');
var nodeCacheModule = require('./cacheModules/nodeCacheModule');

/**
 * cacheCollection constructor
 * @constructor
 * @param settings: {
 *   nameSpace:               {string | ''},
 *   verbose:                 {boolean | false}
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
function cacheCollection(settings, cacheModuleConfig){
  var self = this;
  self.nameSpace = settings.nameSpace;
  self.verbose = settings.verbose;
  self.supportedCaches = ['redis', 'node-cache', 'custom'];

  /**
   * Initialize cacheCollection given the provided constructor params
   */
  function init(){
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
          log(true, 'Failed to get requested cache module with config ' + JSON.stringify(cacheConfig) + ' :', err);
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

  /**
   * Ensures that the provided constructor params will result in a succesful caching configuration
   * @param {object} cacheConfig
   * @return {object} cacheConfig
   */
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

  /**
   * Instantiates a cacheModule given a config object
   * @param {object} cacheConfig
   * @return {cacheModule}
   */
  function getCacheModule(cacheConfig){
    if(cacheConfig.type === 'redis'){
      return new redisCacheModule(cacheConfig);
    }
    else if(cacheConfig.type === 'node-cache'){
      return new nodeCacheModule(cacheConfig);
    }
  }

  /**
   * Checks if a value is "empty"
   * @param {object | string | null | undefined} val
   * @return {boolean}
   */
  function isEmpty (val) {
    return (val === false || val === null || (typeof val == 'object' && Object.keys(val).length == 0));
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

module.exports = cacheCollection;
