const mongoose = require('mongoose');
const config = require('./config/config');
const debug = require('debug')('express-mongoose-es6-rest-api:index');
const util = require('util');

// make bluebird default Promise
Promise = require('bluebird'); // eslint-disable-line no-global-assign

// plugin bluebird promise in mongoose
mongoose.Promise = Promise;

// connect to mongo db
const mongoUri = config.mongo.host;
mongoose.connect(mongoUri, { server: { socketOptions: { keepAlive: 1 } } });
mongoose.connection.on('error', () => {
  throw new Error(`unable to connect to database: ${mongoUri}`);
});

// print mongoose logs in dev env
if (config.mongooseDebug) {
  mongoose.set('debug', (collectionName, method, query, doc) => {
    debug(`${collectionName}.${method}`, util.inspect(query, false, 20), doc);
  });
}


var MetricProof = require('./service/metrics-proof/metricProof.model');
var fs = require('fs');
let data = []
const numberOfEntries = 10;
const hardwareIds = ["_f9u7spdjcpt",
    "_e7bv9pm5byo",
    "_6thdtfvbd89",
    "_sc26xmylgk",
    "_jz7gaf3msys",
    "_lj9bcdu5at",
    "_ql60r5u8zr9",
    "_4day04cmvzf",
    "_p2pgyijzty",
    "_pyvnev9ime"]

startTest();

async function startTest() {


    for (var i = 0; i < numberOfEntries; i++) {

        data.push(createFakeEntry());

    }

    await fs.writeFile("./testingData.json", JSON.stringify(data));
    await insertMetricArray(data);
}


function createFakeEntry() {

    let entry = {};
    entry.hardware_id = hardwareIds[getRandomNumberInRange(0, 3)];
    entry.ipfs_hash = getRandomId();
    entry.metrics = {};
    entry.metrics.watts_consumed = getRandomNumberInRange(1, 4000);
    entry.metrics.watts_produced = getRandomNumberInRange(1, 3000);
    entry.metrics.timestamp = Date.now() + getRandomNumberInRange(1, 200);
    return entry;
}

function getRandomNumberInRange(min, max) {

    return Math.floor(Math.random() * (max + 1)) + min;

}

async function insertMetricArray(array) {

    let result = "";
    try {
        result = await MetricProof.insertMany(array);
        let storage = await MetricProof.find();
    } catch (rawError) {
        console.error(rawError);
        const dbError = new APIError('Error while saving to DB.')
        return next(dbError);
    }
    return result;
}

function getRandomId() {

    return Math.random().toString(36).substr(2, 15);

}