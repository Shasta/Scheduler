const config = require('../config/config');
var _ = require('lodash');
var fs = require('fs');
const ipfs = require("./ipfs");
let jsonTest = JSON.parse(fs.readFileSync("./testingData.json", "utf8"));
const { getMetrics, updateMetricConsolidation } = require('./MetricProof/metricProof.controller');
const { backupHBatch } = require('./HardwareProofBatch/hardwareProofBatch.controller');
const { backupGBatch } = require('./GlobalProofBatch/globalProofBatch.controller');

const HardwareContract = require('../build/contracts/HardwareData.json');

var Web3 = require('web3');
var web3 = new Web3(config.web3Provider);
var exports = module.exports = {};
let hardwareIdsMap = new Map();
let globalIds = [];
let batchIds = [];

let account;

//Manages all the scheduled process
exports.startSchedule = async function () {

    let jsonData;
    const accounts = await web3.eth.getAccounts();
    account = accounts[1];
    //await uploadRootToEthereum("QmbrRiQhDKuZQ7rFN5L4o9Xegq4Qxv3U3RvQRVNyohMsFk");

    //Retrieve data from mongo db
    jsonData = await retrieveData();
    console.log("Obtained data from db")

    if (jsonData.length > 0) {
        //Order data by hardware id
        let orderedData = orderByHardwareId(jsonData);
        console.log("Ordered the received data correctly");

        //Make hash of each batch and upload to ipfs
        let jsonHashes = await uploadBatchToIpfs(orderedData);
        console.log("Uploaded batches to ipfs, processing to manage root hash...")

        //Upload a batch with all hashes to ipfs and ethereum
        const hash = await uploadRootBatch(jsonHashes);
        console.log("Uploaded to ethereum correctly: ", hash);

        //Update consolidated batches
        await updateMetricConsolidation(batchIds);
        console.log("Updated consolidated batches");
    }
}

const retrieveData = async () => {

    let result = await getMetrics();
    let filteredResult = [];

    //clean results
    for (let key in result) {
        insertNewIdToMap(result[key].hardware_id, result[key]._id);
        batchIds.push(result[key]._id);
        const batch = _.pick(result[key], ['hardware_id', 'ipfs_hash']);
        batch.metrics = _.pick(result[key].metrics, ['watts_consumed', 'watts_produced', 'timestamp']);
        filteredResult.push(batch);

    }
    return filteredResult;
}

const uploadRootBatch = async (jsonHashes) => {

    //Post to IPFS the root
    const res = await ipfs.add([Buffer.from(JSON.stringify(jsonHashes))]);
    console.log("Final hash: ", res[0].hash);

    //Save the root hash to ethereum network
    const hash = await uploadRootToEthereum(res[0].hash);
    return hash;
}

const uploadRootToEthereum = async (rootHash) => {

    let HardwareInstance = await new web3.eth.Contract(HardwareContract.abi, HardwareContract.networks[5777].address);

    const rootHashHex = web3.utils.utf8ToHex(rootHash);

    //Add new hash
    const gas = await HardwareInstance.methods.addHash(rootHashHex).estimateGas({ from: account });
    await HardwareInstance.methods.addHash(rootHashHex).send({ from: account, gas: gas });

    //Get number of hashes
    const hashesCount = await HardwareInstance.methods.getHashesCount().call();

    //Check the hash has been added
    let hash = await HardwareInstance.methods.ipfsHashes(hashesCount - 1).call();
    let utfHash = web3.utils.hexToUtf8(hash);

    //Save root to db
    let batch = {};
    batch.ipfs_global_batch_proof = utfHash;
    batch.hardware_batches = globalIds;
    await backupGBatch(batch)
    return utfHash;
}

const uploadBatchToIpfs = async (data) => {

    let jsonHashes = [];

    //Post each hardware batch to ipfs
    for (let [k, v] of data) {

        const res = await ipfs.add([Buffer.from(JSON.stringify(v))]);
        let json = {};
        json.ipfs_batch_proof = res[0].hash;
        json.hardware_id = k;
        json.metric_proofs_ref = hardwareIdsMap.get(k);

        //post the batch to db
        const result = await backupHBatch(json);
        globalIds.push(result._id)

        //Remove the ids for posting to ipfs
        delete json.metric_proofs_ref;
        jsonHashes.push(json);
    }
    return jsonHashes;
}

const orderByHardwareId = (data) => {

    let batchesByHardware = [];
    batchesByHardware.hashes = [];
    let hardwareMap = new Map();
    //Order each batch to a map by hardware id
    for (let key in data) {

        let entry = data[key];
        if (!hardwareMap.has(data[key].hardware_id)) {
            hardwareMap.set(data[key].hardware_id, [])
        }
        hardwareMap.get(data[key].hardware_id).push(entry);
    }
    return hardwareMap;
}

const insertNewIdToMap = (hardware_id, _id) => {

    if (!hardwareIdsMap.has(hardware_id)) {
        hardwareIdsMap.set(hardware_id, [])
    }
    hardwareIdsMap.get(hardware_id).push(_id)

}