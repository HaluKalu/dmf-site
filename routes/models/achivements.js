var mongoose = require('mongoose');

var achivSchema = mongoose.Schema({
    img: {type:String, default: "https://picsum.photos/200"},
    text: {type: String, default: "Lorem ipsum dolor sit amet consectetur adipisicing elit."},
    title: {type: String, default: "Lorem"},
    rnd: String
});


module.exports = mongoose.model('Achivements', achivSchema);
