var HardwareData = artifacts.require('shasta-os/HardwareData');

module.exports = function(deployer) {
  deployer.deploy(HardwareData);
};