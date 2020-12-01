var mongoose = require('mongoose');

var trxSchema = mongoose.Schema({
    username_to: String,
    username_from: String,
    token: Number,
    ref: {type:String, default:""},
    comment: { type: String, default: "Empty" }
});

module.exports = mongoose.model('Trx', trxSchema);
