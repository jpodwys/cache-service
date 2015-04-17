var cacheModule = require('./cacheModule');
var nodeCache = require('node-cache');

function nodeCacheModule(config){

	config = config || {};
	this.cache = new cacheModule(config);

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

	this.cache.get = function(key, cb, cleanKey){
		try {
			cacheKey = (cleanKey) ? cleanKey : key;
			this.log(false, 'Attempting to get key:', {key: cacheKey});
			this.db.get(cacheKey, function(err, result){
				try {
					result = JSON.parse(result);
				} catch (err) {
					//Do nothing
				}
				if(typeof result[cacheKey] !== 'undefined'){
					cb(err, result[cacheKey]);	
				}
				else{
					cb(err, null);
				}
			});
		} catch (err) {
			cb({name: 'GetException', message: err}, null);
		}
	}

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

	this.cache.delete = function(keys, cb){
		try {
			this.db.del(keys, function (err, count){
				if(cb){
					cb(err, count);
				}
			});
		} catch (err) {
			this.log(true, 'Delete failed for cache of type ' + this.type, err);
		}
	}

	this.cache.flushAll = function(){
  	try {
  		this.db.flushAll();
	  	this.log(false, 'Flushing all data from cache of type ' + this.type);
  	} catch (err) {
  		this.log(true, 'Flush failed for cache of type ' + this.type, err);
  	}
  }

  var noop = function(){}

	this.cache.init();
}

module.exports = nodeCacheModule;