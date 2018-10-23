var _ = require('lodash');
var APIError =  require('../../server/helpers/APIError');
// Model
var GProofBatch = require('./globalProofBatch.model');

const backupGBatch = async (batch) => {
    
    try {
        const gProofInstance = new GProofBatch(batch);
        const result = await gProofInstance.save();
        return result;
    } catch (rawError) {
        console.error(rawError);
        const dbError = new APIError('Error while saving to DB.')
        return next(dbError);
    }
}

module.exports =  {
    backupGBatch
}