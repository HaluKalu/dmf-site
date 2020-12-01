var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var userSchema = mongoose.Schema({
    f_name: String,
    l_name: String,
    institut: String,
    group: String,
    username: String,
    ref: String,
    password: String,
    tokens: { type: Number, default: 0 },
    nameTeam: { type: String, default: 'none' },
    verify: { type: Boolean, default: false },
    role: { type: String, default: 'USER' }, //Aviable roles: USER, ORG, ADMIN;
    invites: { type: Array, default: [] },
    achivements: { type: Array, default: [] },
    recoveryCode: { type: String, default: "" },
    reason: { type: String, default: "" },
    alr: Boolean,
    // Testing email connection
    email: String,
    timeUpd: {type: Number, default: 0}
});

userSchema.methods.generateHash = function (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
