const Bookshelf = require('../db/database');



const TestImage = Bookshelf.Model.extend({
  tableName: 'images',
  debug: true,
  hasTimestamps: true,
  virtuals: {
    asset_base64: {
      get() {
        return this.__asset_base64;
      },
      set(val) {
        this.__asset_base64 = val;
      }
    },
    asset_binary: {
      get() {
        return this.__asset_binary;
      },
      set(val) {
        this.__asset_binary = val;
      }
    }
  }
});

// Bookshelf.model is function of
// plugin registry

module.exports = Bookshelf.model('Image', TestImage);
module.exports = TestImage;
