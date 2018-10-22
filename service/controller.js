const config = require('../config/config');
var fs = require('fs');
const ipfs = require("./ipfs");
const jsonTest = JSON.parse(fs.readFileSync("./testingData.json", "utf8"));

const HardwareContract = require('../build/contracts/HardwareData.json');

var Web3 = require('web3');
var web3 = new Web3(config.web3Provider);
var exports = module.exports = {};
let hardwareMap = new Map();
let jsonHashes = [];
let account;
//Manages all the scheduled process
exports.startSchedule = async function() {

    const accounts = await web3.eth.getAccounts();
    account = accounts[1];
    
    await uploadRootToEthereum("randomHash");

    //Order data by hardware id
    orderByHardwareId();

    //Make hash of each batch and upload to ipfs
    await uploadBatchToIpfs();
    console.log("Uploaded batches to ipfs, processing to manage root hash...")
    //Upload a batch with all hashes to ipfs and ethereum
    await uploadRootBatch();

}

async function uploadRootBatch() {

    //Post to IPFS the root
    const res = await ipfs.add([Buffer.from(JSON.stringify(jsonHashes))]);
    console.log("Final hash: ", res[0].hash);

    //Save the root hash to ethereum network

}

async function uploadRootToEthereum(rootHash) {

    const HardwareInstance = await new web3.eth.Contract(HardwareContract.abi, HardwareContract.networks[5777].address);

    const rootHashHex = web3.utils.utf8ToHex(rootHash);
    
    console.log(HardwareInstance)
    //Add new hash
    const gas = await HardwareInstance.methods.addHash(rootHashHex).estimateGas({ from: account });
    await HardwareInstance.methods.addHash(rootHashHex).send({ from: account, gas: gas });
    
    //Get number of hashes
    const hashesCount = await HardwareInstance.methods.getHashesCount().call();

    //Check the hash has been added
    let hash = await HardwareInstance.methods.ipfsHashes(hashesCount - 1).call();
    console.log(web3.utils.hexToUtf8(hash));
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

