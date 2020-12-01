var mongoose = require('mongoose');

var teamSchema = mongoose.Schema({
    name        : String,
    captain     : String,
    users       : {type: Array, default: []},
    invites     : {type: Array, default: [ ]},
    triath      : {type: Boolean, default: false},
    isAccept    : {type: Boolean, default: false},
    mngot3fe    : {type: Array, default: []},
    dzrprmt     : {type: Array, default: []},
    start       : {type: String, default: ""},
    a1afza      : String,
    et1         : String,
    et2         : String,
    et3         : String,
    et4         : String,
    et5         : String
});

module.exports = mongoose.model('Team', teamSchema);
