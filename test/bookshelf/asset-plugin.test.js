const log = require('mk-log');
const TestImageModel = require('./models/test-image-model');
const clearTable = require('./utils/clear-table');
const yaml = require('js-yaml');
const isValidTestEnv = require('../utils/is-valid-test-env');
const gracefulStat = require('mk-graceful-stat');
const tape = require('tape');
const fs = require('fs').promises;
const path = require('path');

isValidTestEnv();

//key: there must be two files for each key 
//mimeType expected result mime type
const fileTypes = {
  png: 'image/png',
  jpg: 'image/jpeg',
  svg: 'image/svg+xml',
  pdf: 'application/pdf' 
};

async function prepareFixtures() {

  const fixtures = { };

  for (let key in fileTypes) {
    const base64Data = 
      await fs.readFile(
        path.join(__dirname, '..', 'assets',`example-${key}.base64`),
        'utf8' );
    
    //log.info('base64Data', base64Data);

    fixtures[key] = {
      name: `TestUpdateLastName for ${key}`,
      asset_base64: base64Data,
      asset_file_name: `example.${key}`
    }; 
  } 
  return fixtures;
}


async function main() {

  tape('Adapter File Type records create with asset', async function(t) {
    try {
      await clearTable(TestImageModel);
      const fixtures = await prepareFixtures(); 

      for (let key in fileTypes) {
        const testFixture = fixtures[key]; 

        const testMedia = new TestImageModel(testFixture);
        const saveResultRaw = await testMedia.save();
        const saveResult = saveResultRaw.toJSON();
       
        //log.info('saveResult', saveResult);

        t.equal(testFixture.asset_file_name, saveResult.asset_file_name);
        t.ok(saveResult.asset_file_size, 'should have asset_file_size');
        t.ok(saveResult.asset_updated_at, 'should have asset_updated_at');
        t.ok(saveResult.file_hash, 'should have file_hash');

        t.equal(saveResult.asset_content_type, fileTypes[key], 
          `should be mime type "${fileTypes[key]}" for "${key}"`); 
        
        const rawFoundResult = await TestImageModel.where({id: saveResult.id}).fetch();
        const foundResult = rawFoundResult.toJSON();

        //log.info(foundResult);

        const jsonDimensions = yaml.load(foundResult.dimensions);
   
        t.ok(jsonDimensions.thumbnail.w, 'width  for dimension thumbnail');
        t.ok(jsonDimensions.thumbnail.h, 'height for dimension thumbnail');
      }
    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });

  tape('Adapter File Type records delete with asset', async function(t) {
  
    try {

      await clearTable(TestImageModel);

      const fixtures = await prepareFixtures();

      for (let key in fileTypes) {
        //const fileType = fileTypes[key];
        const testFixture = fixtures[key]; 
        // const testMediaData = new TestImageModel(testFixture);
        // const saveResultRaw = await testMediaData.save();
        // const saveResult = saveResultRaw.toJSON();

        const testImage = new TestImageModel(testFixture);

        const saveResultRaw = await testImage.save();

        const saveResult = saveResultRaw.toJSON();

        const assetsRootPath = path.resolve(__dirname, '../../public/assets');
     
        const statCreated = 
          await gracefulStat(assetsRootPath, 
            `${saveResult.id}`, 'original', saveResult.asset_file_name);
        
        t.ok(statCreated, 'asset files created');

        const rawDestroyModel 
          = await TestImageModel.where({id: saveResult.id}).fetch();
       
        const destroyModel = rawDestroyModel.toJSON();
        
        await rawDestroyModel.destroy(); 

        const deletedStatPath 
          = path.join(assetsRootPath, `${destroyModel.id}`);

        const statDeleted = 
          await gracefulStat(deletedStatPath);

        t.notOk(statDeleted, `asset files deleted ${key}`);
      }
    } catch (err) {
      log.error(err);
    } finally {
      t.end(); 
    }
  });

  tape('exit', (t) => {
    t.end(); 
    process.exit(0); 
  }); 
}

main();

