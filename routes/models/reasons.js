var mongoose = require('mongoose');

var reasonsSchema = mongoose.Schema({
    username: String,
    token   : Number,
    ref     : String,
    comment : {type: String, default: "Empty"}
});

module.exports = mongoose.model('Reasons', reasonsSchema);
