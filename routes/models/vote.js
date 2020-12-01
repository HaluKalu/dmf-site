var mongoose = require('mongoose');

var vtngSchema = mongoose.Schema({
    // id: String,
    imgPath : {type:String, default:"/img/reg.png"},
    txt     : {type:String, default:"Ничего не придумал"},
    votes   : {type:Number, default:0}
});

module.exports = mongoose.model('Vote', vtngSchema);
