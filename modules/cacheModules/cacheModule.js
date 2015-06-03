/**
 * cacheModule constructor
 * @constructor
 * @param config: {
 *    verbose:              {bool | false},
 *    expiration:           {integer | 900},
 *    readOnly:             {boolean | false},
 *    checkOnPreviousEmpty  {bool | true}
 * }
 */
function cacheModule(config){
  var self = this;
  config = config || {};
  self.verbose = config.verbose || false;
  self.expiration = config.defaultExpiration || 900;
  self.readOnly = (typeof config.readOnly === 'boolean') ? config.readOnly : false;
  self.checkOnPreviousEmpty = (typeof config.checkOnPreviousEmpty === 'boolean') ? config.checkOnPreviousEmpty : true;

  /**
   * Shared cacheModule delete logic
   * @param {array} keys
   * @param {function} cb
   */
  self.del = function(keys, cb){
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

  /**
   * Shared cacheModule log logic
   * @param {boolean} isError
   * @param {string} message
   * @param {object} data
   */
  self.log = function(isError, message, data){
    var indentifier = 'cacheService: ';
    if(self.verbose || isError){
      if(data) console.log(indentifier + message, data);
      else console.log(indentifier + message);
    }
  }
}

module.exports = cacheModule;
