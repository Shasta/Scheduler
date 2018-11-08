const config = require('../config/config');
var _ = require('lodash');
var fs = require('fs');
const ipfs = require("./ipfs");
const { getMetrics, updateMetricConsolidation } = require('./MetricProof/metricProof.controller');
const { backupHBatch } = require('./HardwareProofBatch/hardwareProofBatch.controller');
const { backupGBatch } = require('./GlobalProofBatch/globalProofBatch.controller');
const storage = require('node-persist');

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
    //const accounts = await web3.eth.getAccounts();
    account = web3.eth.accounts.privateKeyToAccount(config.accountPrivateKey);

    //Retrieve data from mongo db
    jsonData = await retrieveData();
    console.log("Obtained data from db")
    console.log("Consolidating " + jsonData.length + " batches")

    if (jsonData.length > 0) {
        //Order data by hardware id
        let orderedData = orderByHardwareId(jsonData);
        console.log("Ordered the received data correctly");

        //Make hash of each batch and upload to ipfs
        let batches = await uploadBatchToIpfs(orderedData);
        console.log("Uploaded batches to ipfs, processing to manage root hash...")

        const previous_hash = await storage.getItem('lastHash');
        const rootJson = {
            previous_hash,
            batches
        }

        //Upload a batch with all hashes to ipfs and ethereum
        const hash = await uploadRootBatch(rootJson);
        console.log("Uploaded to ethereum correctly: ", hash);

        //Update previous hash
        await storage.setItem('lastHash', hash);

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

    const balance = await web3.eth.getBalance(account.address);
    let HardwareInstance = await new web3.eth.Contract(HardwareContract.abi, HardwareContract.networks[config.networkId].address);
    const rootHashHex = web3.utils.utf8ToHex(rootHash);

    //Add new hash
    const gas = await HardwareInstance.methods.addHash(rootHashHex).estimateGas({ from: account.address });
    const txData = await HardwareInstance.methods.addHash(rootHashHex).encodeABI();

    const tx = {
        from: account.address,
        to: HardwareInstance._address,
        gas: gas,
        data: txData,
        value: 0
    }

    const signedTx = await web3.eth.accounts.signTransaction(tx, config.accountPrivateKey);
    const sentTx = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    
    //Get number of hashes
    const hashesCount = await HardwareInstance.methods.getHashesCount().call();
    console.log("Current stored hashes: " + hashesCount)
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