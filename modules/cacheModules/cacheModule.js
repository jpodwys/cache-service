function cacheModule(config){
	var self = this;
	config = config || {};
	self.verbose = config.verbose || false;
	self.expiration = config.defaultExpiration || 900;
	//self.cacheWhenEmpty = (typeof config.cacheWhenEmpty === 'boolean') ? config.cacheWhenEmpty : true;
	self.readOnly = (typeof config.readOnly === 'boolean') ? config.readOnly : false;
	self.checkOnPreviousEmpty = (typeof config.checkOnPreviousEmpty === 'boolean') ? config.checkOnPreviousEmpty : false;

	self.get = function(key, cb, cleanKey){
		try {
			cacheKey = (cleanKey) ? cleanKey : key;
			self.log(false, 'Attempting to get key:', {key: cacheKey});
			self.db.get(cacheKey, function(err, result){
				try {
					result = JSON.parse(result);
				} catch (err) {
					//Do nothing
				}
	      cb(err, result);
			});
		} catch (err) {
			cb({name: 'GetException', message: err}, null);
		}
	}

	self.log = function (isError, message, data){
	  var indentifier = 'cacheService: ';
	 	if(self.verbose || isError){
			if(data) console.log(indentifier + message, data);
			else console.log(indentifier + message);
		}
	}
}

module.exports = cacheModule;