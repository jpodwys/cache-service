var cacheModule = require('./cacheModule');
var redis = require('redis');

function redisCacheModule(config){

	config = config || {};
	this.cache = new cacheModule(config);

	this.cache.init = function(){
		this.type = config.type || 'redis-standalone';
		if(config.redisMock){
			this.db = config.redisMock;
		}
		else{
			if(config.redisUrl){
				this.redisData = config.redisUrl || null;
			}
			else if(config.redisEnv){
				this.redisData = process.env[config.redisEnv] || null;
			}
			else if(config.redisData){
				this.redisData = config.redisData
			}
			this.readOnly = (typeof config.readOnly === 'boolean') ? config.readOnly : false;
			try {
				if (this.redisData) {
					if(typeof this.redisData === 'string'){
						var redisURL = require('url').parse(this.redisData);
						this.db = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true, max_attempts: 5});
						this.db.auth(redisURL.auth.split(":")[1]);
					}
					else{
						this.db = redis.createClient(this.redisData.port, this.redisData.hostname, {no_ready_check: true, max_attempts: 5});
						this.db.auth(this.redisData.auth);
					}
					this.db.on('error', function(err) {
						console.log("Error " + err);
					});
					process.on('SIGTERM', function() {
						this.db.quit();
					});
					this.log(false, 'Redis client created with the following defaults:', {expiration: this.expiration, verbose: this.verbose, readOnly: this.readOnly});
				} else {
					this.db = false;
					this.log(false, 'Redis client not created: no redis config provided');
				}
			} catch (err) {
				this.db = false;
				this.log(true, 'Redis client not created:', err);
			}
		}
	}

	this.cache.set = function(key, value, expiration, cb){
		try {
			if(!this.readOnly){
				expiration = expiration || this.expiration;
				try {
					value = JSON.stringify(value);
				} catch (err) {
					//Do nothing
				}
				cb = cb || noop;
				this.db.setex(key, expiration, value, cb);
			}	
		}catch (err) {
			this.log(true, 'Set failed for cache of type ' + this.type, {name: 'RedisSetException', message: err});
		}
  }

  this.cache.del = function(keys, cb){
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
  		this.db.flushall();
	  	this.log(false, 'Flushing all data from cache of type ' + this.type);
  	} catch (err) {
  		this.log(true, 'Flush failed for cache of type ' + this.type, err);
  	}
  }

  var noop = function(){}

	this.cache.init();
}
	    
module.exports = redisCacheModule;