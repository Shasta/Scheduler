var fs = require('fs');
const ipfs = require("./ipfs");
const jsonTest = JSON.parse(fs.readFileSync("./testingData.json", "utf8"));

var exports = module.exports = {};

//Manages all the scheduled process
exports.startSchedule = function() {

    console.log("hola");
    //Order data by hardware id

}

function orderByHardwareId() {

    let hardwareMap = new Map();

    let batchesByHardware = [];
    batchesByHardware.hashes = [];

    for( var key in jsonTest) {

        if (hardwareMap.has(jsonTest[key])) {
            hardwareMap.get(jsonTest[key].hardwareId)
        } else {
            hardwareMap.set(jsonTest[key].hardwareId, [])
            let entry = jsonTest[key];
            delete entry.hardwareIdM
            hardwareMap.get(jsonTest[key].hardwareId).push(entry)

        }

    }

}

