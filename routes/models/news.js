var mongoose = require('mongoose');

var newsSchema = mongoose.Schema({
    title: String,
    fullDescr: String,
    shortDescr: String,
    publ: Boolean,
    preview: {type: String, default: "Они решили посмотреть видео на балконе, а потом..."}
});

module.exports = mongoose.model('News', newsSchema);
