const log = require('mk-log');
const TestImageModel = require('./models/test-image-model');
const clearTable = require('./utils/clear-table');
const isValidTestEnv = require('../utils/is-valid-test-env');
const gracefulStat = require('mk-graceful-stat');
const tape = require('tape');
const fs = require('fs').promises;
const path = require('path');

isValidTestEnv();

async function main() {

  let base64PNGData;
  let testImageFixtureA;

  try {

    base64PNGData = await fs.readFile(
      path.join(__dirname, '..', 'assets','example-png.base64'), 'utf8' );

    testImageFixtureA = {
      name: 'TestUpdateLastNameA',
      asset_file_name: 'example.png', 
      asset_base64: base64PNGData,

    };
  } catch (err) {
    log.error(err);
  }

  tape('Adapter Image record  with asset', async function(t) {
    
    try {

      await clearTable(TestImageModel);
      const testImage = new TestImageModel(testImageFixtureA);
      const saveResultRaw = await testImage.save();
      const saveResult = saveResultRaw.toJSON(); 
      t.equal(testImageFixtureA.asset_file_name, saveResult.asset_file_name);
      t.ok(saveResult.asset_file_size, 'should have asset_file_size');
      t.ok(saveResult.asset_updated_at, 'should have asset_updated_at');
      t.ok(saveResult.file_hash, 'should have file_hash');
      t.equal(saveResult.asset_content_type, 'image/png', 
        'should be mime/content_type image/png');

      log.info(saveResult.dimensions);

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

