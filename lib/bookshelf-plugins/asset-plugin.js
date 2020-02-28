const log = require('mk-log');
const ImageConverter = require('mk-image-converter');
const path = require('path');
const createHash = require('../utils/create-hash');
const yaml = require('js-yaml');

function pluralize(name) {
  // TODO: use real pluralization here
  return `${name}s`; 
}


module.exports = function assetPlugin(bookshelf, optionArgs) {

  const pluginOptions = {
    assetsRootDir: 'public', 
    name: 'asset',
    types: [], // size { type: 'small', size: '300x>', ext: 'jpg' }  
  };

  if (optionArgs) {
    for (let key in optionArgs) {
      pluginOptions[key] = optionArgs[key];
    }
  }

  const base64AttrName = `${pluginOptions.name}_base64`;
  const binaryAttrName = `${pluginOptions.name}_binary`;
  const pluralizedAssetName = pluralize(pluginOptions.name);
  // const isModel = this instanceof bookshelf.Model; 
  // const targetModel = isModel ? this.constructor : this.target || this.model;
  const proto = bookshelf.Model.prototype; 

  const Model = bookshelf.Model.extend({

    constructor(attributes, options) {

      proto.constructor.apply(this, arguments);

      this.on('saving', async (model, attrs, options) => {

        try {

          if (model[base64AttrName] || model[binaryAttrName]) {
            const assetFileName = attrs[`${pluginOptions.name}_file_name`];
            const targetPath = 
              path.join(pluginOptions.assetsRootDir, pluralizedAssetName); 
            const converter = await ImageConverter(path.resolve(targetPath)); 
            let saveResult; 
            if (model[base64AttrName]) {
              const base64Data = model[base64AttrName];
              saveResult = await converter.saveOriginalBase64(assetFileName, base64Data); 
            } else if (model[binaryAttrName]) {
              const binaryData = model[binaryAttrName];
              saveResult = await converter.saveOriginalBinary(assetFileName, binaryData); 
            }

            attrs[`${pluginOptions.name}_file_size`] = saveResult.stat.size;
            attrs[`${pluginOptions.name}_updated_at`] = saveResult.stat.mtime;  
            attrs[`${pluginOptions.name}_content_type`] = saveResult.mimeType;
            attrs['file_hash'] = createHash(`${saveResult.stat.mtime}`);

            let convertResult;

            if (pluginOptions.types) {
              convertResult = 
                await converter.convert(assetFileName, pluginOptions.types);
            }
            
            const dimensions = {};

            for (let i = 0, l = convertResult.length; i < l; i++) {
              dimensions[convertResult[i].type] = { 
                w: convertResult[i].w,
                h: convertResult[i].h
              }; 
            } 

            attrs['dimensions'] = yaml.safeDump(dimensions); 

            return Promise.resolve({save: saveResult, convert: convertResult});
          } else {
            return Promise.resolve();
          }
        } catch (err) {
          log.error(err);
        }
      });
    }
  }); 

  bookshelf.Model = Model;
};

