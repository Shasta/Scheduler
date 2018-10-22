var _ = require('lodash');
var APIError =  require('../../server/helpers/APIError');
// Model
var MetricProof = require('./metricProof.model');

const backupMetric = async (req, res, next) => {
    if (!req.metricProof) {
        const invalidMetric = new APIError("Error while validating metric", "400", true)
        return next(invalidMetric);
    }
    const metricInstance = new MetricProof(req.metricProof);
    try {
        await metricInstance.save()
    } catch (rawError) {
        console.error(rawError);
        const dbError = new APIError('Error while saving to DB.')
        return next(dbError);
    }
    res.send({ status: "ok", message: 'backup-saved' })
}

const getMetrics = async (fromDate) => {

    let result = "";
    try {
        result = await MetricProof.find();
    } catch (rawError) {
        console.error(rawError);
        const dbError = new APIError('Error while saving to DB.')
        return next(dbError);
    }
    return result;
}

module.exports =  {
    backupMetric,
    getMetrics
}