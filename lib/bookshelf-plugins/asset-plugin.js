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

  const pluginOptions = Object.assign({
    rootDir: 'public', 
    name: 'asset',
    types: [], // size { type: 'small', size: '300x>', ext: 'jpg' }  
  }, optionArgs);

  const base64AttrName = `${pluginOptions.name}_base64`;
  const binaryAttrName = `${pluginOptions.name}_binary`;
  const pluralizedAssetName = pluralize(pluginOptions.name);
  const targetPath = 
    path.join(pluginOptions.rootDir, pluralizedAssetName); 
  const resolvedTargetPath = path.resolve(targetPath); 

  // const isModel = this instanceof bookshelf.Model; 
  // const targetModel = isModel ? this.constructor : this.target || this.model;
  const proto = bookshelf.Model.prototype; 

  const Model = bookshelf.Model.extend({

    constructor(attributes, options) {

      proto.constructor.apply(this, arguments);

      this.on('saving', async (model, attrs, options) => {

        try {

          if (model[base64AttrName] || model[binaryAttrName]) {
            
            const converter = await ImageConverter(resolvedTargetPath); 

            const assetFileName = attrs[`${pluginOptions.name}_file_name`];
            let saveResult; 
            if (model[base64AttrName]) {
              const base64Data = model[base64AttrName];
              saveResult = await converter.saveTempBase64(assetFileName, base64Data); 
            } else if (model[binaryAttrName]) {
              const binaryData = model[binaryAttrName];
              saveResult = await converter.saveTempBinary(assetFileName, binaryData); 
            }

            attrs[`${pluginOptions.name}_file_size`] = saveResult.stat.size;
            attrs[`${pluginOptions.name}_updated_at`] = saveResult.stat.mtime;  
            attrs[`${pluginOptions.name}_content_type`] = saveResult.mimeType;
            attrs['file_hash'] = createHash(`${saveResult.stat.mtime}`);

            // here only a temp file gets saved because
            // the record is not saved yet and thus
            // there is no id

            return Promise.resolve();
          }
        } catch (err) {
          log.error(err);
        }
      });

      this.on('saved', async  (rawModel) =>  {
        try {
          // now load record again from database to
          // check whether dimensions were set in 'saved' event
          // Rationale: dimensions can only be read when the files were
          // saved in their final destination, which includes the record id
          // in the path.

          const model = rawModel.toJSON(); 

          const assetFileName = model[`${pluginOptions.name}_file_name`];

          if (assetFileName) {
            const converter = await ImageConverter(resolvedTargetPath); 
          
            let convertResult = 
              await converter.convert(assetFileName, 
                pluginOptions.types, {subPath: `${model.id}` });

            log.info('baseAdapter convertResult', convertResult);


            const dimensions = {};

            for (let i = 0, l = convertResult.length; i < l; i++) {
              dimensions[convertResult[i].type] = { 
                w: convertResult[i].w,
                h: convertResult[i].h
              }; 
            } 

            const yamlDims = yaml.safeDump(dimensions);
            const blockDimensions = `---\n${yamlDims}`; 

            // save the yamlDims without firing save again
            // i.e. circumvent bookshelf save
            const updateQuery = `UPDATE ${rawModel.tableName} SET dimensions=? WHERE id=?`;
            const updateValues = [blockDimensions, model.id];

            //const rawUpdatedResult = 
            await bookshelf.knex.raw(updateQuery, updateValues); 
            model.dimensions = blockDimensions; 
            return Promise.resolve({save: model, convert: convertResult});
          } 
        } catch (err) {
          log.error(err);
        }

      });


    }
  }); 

  bookshelf.Model = Model;
};

