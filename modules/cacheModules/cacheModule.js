function cacheModule(config){
	var self = this;
	config = config || {};
	self.verbose = config.verbose || false;
	self.expiration = config.defaultExpiration || 900;
	self.readOnly = (typeof config.readOnly === 'boolean') ? config.readOnly : false;
	self.checkOnPreviousEmpty = (typeof config.checkOnPreviousEmpty === 'boolean') ? config.checkOnPreviousEmpty : true;

	self.log = function (isError, message, data){
	  var indentifier = 'cacheService: ';
	 	if(self.verbose || isError){
			if(data) console.log(indentifier + message, data);
			else console.log(indentifier + message);
		}
	}
}

module.exports = cacheModule;