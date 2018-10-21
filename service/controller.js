var fs = require('fs');
const ipfs = require("./ipfs");
const jsonTest = JSON.parse(fs.readFileSync("./testingData.json", "utf8"));

var exports = module.exports = {};

//Manages all the scheduled process
exports.startSchedule = function() {

    console.log("hola");
    //Order data by hardware id
    orderByHardwareId();
}

function orderByHardwareId() {
    let hardwareMap = new Map();

    let batchesByHardware = [];
    batchesByHardware.hashes = [];

    for( var key in jsonTest) {

        let entry = jsonTest[key];
        delete entry.hardwareIdM;
        if (hardwareMap.has(jsonTest[key].hardwareId)) {
            hardwareMap.get(jsonTest[key].hardwareId).push(entry);
        } else {
            hardwareMap.set(jsonTest[key].hardwareId, [])
            hardwareMap.get(jsonTest[key].hardwareId).push(entry)
        }
    }
    
}

