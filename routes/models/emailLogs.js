var mongoose = require('mongoose');

var emailSchema = mongoose.Schema({
    error: String,
    info: {type: String, default: ""}
});

module.exports = mongoose.model('EmailLogs', emailSchema);
