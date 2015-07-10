/**
 * cacheCollection constructor
 * @constructor
 * @param settings: {
 *   nameSpace:               {string | ''},
 *   verbose:                 {boolean | false}
 * }
 * @param cacheModules: [
 *    {cache module object}
 * ]
 */
function cacheCollection(settings, cacheModules){
  var self = this;

  /**
   * Initialize cacheCollection given the provided constructor params
   */
  function init(){
    self.caches = [];
    if(isEmpty(cacheModules)){
      log(false, 'No cacheModules array provided--using the default configuration.');
      getDefaultConfiguration();
    }
    else{
      log(false, 'cacheModules array provided--using a custom configuration.');
      getCustomConfiguration();
      if(self.caches.length < 1){
        throw new exception('NoCacheException', 'No caches were succesfully initialized.');
      }
    }
  }

  /**
   * Adds a nodeCacheModule instance to self.caches if no cacheModules array is provided
   */
  function getDefaultConfiguration(){
    var cModule = require('cache-service-cache-module');
    var cacheModule = new cModule();
    cacheModule = addSettings(cacheModule);
    self.caches.push(cacheModule);
  }

  /**
   * Adds caches that are not 'empty' from the cacheModules array to self.caches
   */
  function getCustomConfiguration(){
    for(var i = 0; i < cacheModules.length; i++){
      var cacheModule = cacheModules[i];
      if(isEmpty(cacheModule)){
        log(true, 'Cache module at index ' + i + ' is \'empty\'.');
        continue;
      }
      cacheModule = addSettings(cacheModule);
      self.caches.push(cacheModule);
    }
  }

  /**
   * Adds cache-service config properties to each cache module
   * @param {object} cacheModule
   * @return {object} cacheModule
   */
  function addSettings(cacheModule){
    cacheModule.nameSpace = settings.nameSpace;
    cacheModule.verbose = settings.verbose;
    return cacheModule;
  }

  /**
   * Checks if a value is "empty"
   * @param {object | string | null | undefined} val
   * @return {boolean}
   */
  function isEmpty (val) {
    return (val === undefined || val === false || val === null || (typeof val == 'object' && Object.keys(val).length == 0));
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
