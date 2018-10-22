var fs = require('fs');
const ipfs = require("./ipfs");
const jsonTest = JSON.parse(fs.readFileSync("./testingData.json", "utf8"));

var exports = module.exports = {};
let hardwareMap = new Map();
let jsonHashes = [];

//Manages all the scheduled process
exports.startSchedule = async function() {

    //Order data by hardware id
    orderByHardwareId();

    //Make hash of each batch and upload to ipfs
    await uploadBatchToIpfs();

    //Upload a batch with all hashes to ipfs and ethereum
    await uploadRootBatch();

}

async function uploadRootBatch() {

    //Post to IPFS the root
    const res = await ipfs.add([Buffer.from(JSON.stringify(jsonHashes))]);
    console.log("Final hash: ", res[0].hash);

    //Save the root hash to ethereum network

}

async function uploadBatchToIpfs() {

    //Post each hardware batch to ipfs
    for ( let [k, v] of hardwareMap) {

        const res = await ipfs.add([Buffer.from(JSON.stringify(v))]);
        let json = {};
        json.hash = res[0].hash;
        json.timestamp = Date.now();
        json.hardwareId = k;
        jsonHashes.push(json);

    }
}

function orderByHardwareId() {

    let batchesByHardware = [];
    batchesByHardware.hashes = [];

    //Order each batch to a map by hardware id
    for( let key in jsonTest) {

        let entry = jsonTest[key];
        if (hardwareMap.has(jsonTest[key].hardwareId)) {
            hardwareMap.get(jsonTest[key].hardwareId).push(entry);
        } else {
            hardwareMap.set(jsonTest[key].hardwareId, [])
            hardwareMap.get(jsonTest[key].hardwareId).push(entry)
        }
    }

}

