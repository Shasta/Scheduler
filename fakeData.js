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

for (var i = 0; i < numberOfEntries; i++) {

    data.push(createFakeEntry());

}

fs.writeFile("./testingData.json", JSON.stringify(data), function(err) {

    if(err) {
        console.log(err);
    }

    console.log("The file was saved!");
});

function createFakeEntry() {

    let entry = {};
    entry.timestamp = Date.now() + getRandomNumberInRange(1,200);
    entry.hardwareId = hardwareIds[getRandomNumberInRange(0,3)];
    entry.energyConsumed = getRandomNumberInRange(1, 4000);
    entry.energyProduced = getRandomNumberInRange(1, 3000);
    return entry;
}

function getRandomNumberInRange(min, max) {

    return  Math.floor(Math.random() * (max + 1)) + min;

}

function getRandomId() {

    return '_' + Math.random().toString(36).substr(2, 15);

}