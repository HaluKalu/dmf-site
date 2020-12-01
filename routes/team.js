var express = require('express');
var app = express.Router();
var mongoose = require("mongoose");
var crypto = require('crypto');
var bcrypt = require('bcrypt-nodejs');
var moment = require('moment')

var Users = require('../routes/models/user.js');
var Team = require('../routes/models/team.js');
// var Trx = require('../routes/models/trx.js');
// var News = require('../routes/models/news.js');
// var Vote = require('../routes/models/vote.js');

const maxUsersInTeam = 11;

const capitalize = (s) => {
	if (typeof s !== 'string') return ''
	return s.charAt(0).toUpperCase() + s.slice(1)
}

module.exports = function (passport) {
	app.use(checkAuthentication, function (req, res, next) {
		next();
	});

	app.get('/', checkAuthentication, function (req, res) {
		if (req.user.nameTeam == "none") {
			res.render('team/my_team', { user: req.user, team: "", msg: req.flash('create-msg'), isCap: false })
		} else {
			Users.find({ "nameTeam": req.user.nameTeam }, function (err, team) {
				Team.findOne({ "name": req.user.nameTeam }, function (err, tm) {
					var inv = tm.invites;
					var isCap = (req.user.username == tm.captain);
					res.render('team/my_team', { user: req.user, team: team, msg: "", invites: inv, isCap: isCap });
				})
			});
		}
	});

	app.get('/delUser/:id/:lg', checkAuthentication, function (req, res) {
		Team.findOne({ "name": req.params.id }, function (err, tmp) {
			if (!tmp) {
				res.send("NOPE");
				return;
			} else {
				var users = [];
				for (i = 0; i < tmp.users.length; i++)
					if (tmp.users[i] != req.params.lg) users.push(tmp.users[i]);

				Users.findOneAndUpdate({ "username": req.params.lg }, { "nameTeam": "none" }, { upsert: false }, function (err, doc, re) { });
				Team.findOneAndUpdate({ "name": req.params.id }, { "users": users }, { upsert: false }, function (err, doc, re) { });
				res.send("OK");
			}
		})
	})

	app.post('/create', checkAuthentication, function (req, res) {
		Team.findOne({ 'name': req.body.team.trim() }, function (err, re) {
			if (re || req.body.team.toLowerCase().trim() == "none") {
				req.flash('create-msg', "Такая команда уже существует");
				res.redirect("/team");
			} else {
				var newTeam = new Team();
				newTeam.name = req.body.team.trim();
				var members = [req.user.username];
				newTeam.users = members;
				newTeam.captain = req.user.username;
				newTeam.invites = [];
				Users.findOneAndUpdate({ "username": req.user.username }, { "nameTeam": req.body.team.trim() }, { upsert: true }, function (err, doc, re) { });
				newTeam.save(function (err) { });
				res.redirect('/team');
			}
		});
	});


	app.get('/invite/:id', checkAuthentication, function (req, res) {
		var id = req.params.id.trim();
		Users.findOne({ 'username': id }, function (err, re) {
			if (!re) {
				res.send("Пользователь не найден");
			} else {
				var alreadyInvited = false;
				re.invites.forEach(function (rr) {
					if (req.user.nameTeam == rr) alreadyInvited = true;
				});
				if (alreadyInvited)
					res.send("Пользователь уже был приглашен в команду!");
				else {
					if (re.nameTeam == req.user.nameTeam) {
						res.send("Пользователь уже в команде!");
					} else {
						Team.findOne({ "name": req.user.nameTeam }, function (err, rez) {
							if (rez.users.length + rez.invites.length >= maxUsersInTeam && rez.captain != "halukalu") {
								res.send("В команде уже максимальное количество участников!");
							} else {
								var invites = rez.invites;
								invites.push(id);
								Team.findOneAndUpdate({ 'name': req.user.nameTeam }, { 'invites': invites }, { upsert: true }, function (err, doc, re) { });
								invites = re.invites;
								invites.push(req.user.nameTeam);
								Users.findOneAndUpdate({ "username": id }, { "invites": invites }, { upsert: true }, function (err, doc, re) { });
								res.send("OK");
							}
						})
					}
				}
			}
		})
	});

	app.get('/remove_invite/:id', checkAuthentication, function (req, res) {
		var id = req.params.id.trim();
		Users.findOne({ "username": id }, function (err, re) {
			if (!re) {
				res.send('Пользователь не найден.');
				return;
			} else {
				if (re.invites.includes(req.user.nameTeam)) {
					Team.findOne({ 'name': req.user.nameTeam }, function (err, rez) {
						var inv_t = [];
						for (i = 0; i < rez.invites.length; i++)
							if (rez.invites[i] != req.params.id) inv_t.push(rez.invites[i]);
						Team.findOneAndUpdate({ "name": req.user.nameTeam }, { "invites": inv_t }, { upsert: false }, function (err, doc, re) { });
					})
					var inv_u = [];
					for (i = 0; i < re.invites.length; i++)
						if (re.invites[i] != req.user.nameTeam) inv_u.push(re.invites[i]);
					Users.findOneAndUpdate({ "username": req.params.id }, { "invites": inv_u }, { upsert: false }, function (err, doc, re) { });
					res.send("OK");
				}
			}
		})
	});

	app.get('/exit', checkAuthentication, function (req, res) {
		Team.findOne({ 'name': req.user.nameTeam }, function (err, re) {
			if (re.captain == req.user.username) {
				Team.findOneAndRemove({ 'name': req.user.nameTeam }, function (err, re) { });
				for (i = 0; i < re.users.length; i++) {
					Users.findOneAndUpdate({ 'username': re.users[i] }, { 'nameTeam': "none" }, { upsert: true }, function (err, doc, re) {
						res.redirect('/team');
					});
				}
			} else {
				Team.findOne({ 'name': req.user.nameTeam }, function (err, ret) {
					console.log(ret);
					var users = [];
					for (i = 0; i < ret.users.length; i++)
						if (ret.users[i] != req.user.username) users.push(ret.users[i]);
					re.users = users;
					Team.findOneAndUpdate({ 'name': req.user.nameTeam }, { 'users': users }, { upsert: true }, function (err, doc, ret) { });
					Users.findOneAndUpdate({ 'username': req.user.username }, { 'nameTeam': "none" }, { upsert: true }, function (err, doc, re) { });
					res.redirect('/team');

				});
			}
		});
	});

	app.get('/:id', checkAuthentication, function (req, res) {
		if (req.user.nameTeam == req.params.id && req.params.id != "none") {
			res.redirect('/team');
		} else {
			Users.find({ "nameTeam": req.params.id }, function (err, re) {
				if (re && req.params.id != "none") {
					var isInv = false;
					var isVer = req.user.verify;
					arr = req.user.invites;
					for (i = 0; i < arr.length; i++) {
						if (arr[i] == req.params.id) isInv = true;
					}
					res.render('team/team', { msg: "", users: re, name: (req.params.id), isInv: isInv, isVer: isVer });
				} else {
					res.render('team/team', { msg: "Команда отсутствует!", name: capitalize(req.params.id), isVer: isVer });
				}
			})
		}
	});

	app.get('/:id/:type', checkAuthentication, function (req, res) {
		console.log("WTF")
		Team.findOne({ 'name': req.params.id }, function (err, re) {
			console.log(req.params);
			if (re.invites.includes(req.user.username)) {
				if (req.params.type == "accept") {
					var arr = re.users;
					arr.push(req.user.username);
					console.log(arr);
					var inv = [];
					for (i = 0; i < re.invites.length; i++) {
						if (req.user.username != re.invites[i]) inv.push(re.invites[i]);
					}
					Team.findOneAndUpdate({ "name": req.params.id }, { "users": arr, 'invites': inv }, { 'upsert': false }, function (err, doc, re) { });
					Users.findOneAndUpdate({ "username": req.user.username }, { "invites": [], 'nameTeam': req.params.id }, { 'upsert': false }, function (err, doc, re) { if (err) { console.log("user2"); req.flash("create-msg", "Пользователь 2 не найден!"); return; } });
				} else if (req.params.type == "reject") {
					Users.findOne({ 'username': req.user.username }, function (err, ree) {
						var arr = [];
						for (i = 0; i < ree.invites.length; i++) {
							if (ree.invites[i] != req.params.id) arr.push(ree.invites[i]);
						}
						var inv = [];
						for (i = 0; i < re.invites.length; i++) {
							if (req.user.username != re.invites[i]) inv.push(re.invites[i]);
						}
						Users.findOneAndUpdate({ "username": req.user.username }, { "invites": arr }, function (err, doc, re) { if (err) { console.log("user2"); req.flash("create-msg", "Пользователь 2 не найден!"); return; } });
						Team.findOneAndUpdate({ "name": req.params.id }, { 'invites': inv }, { 'upsert': true }, function (err, doc, re) { });
					})
				}
			}
		});
		res.redirect('/team');

	});


	function isLoggedIn(req) {
		return req.isAuthenticated();
	}
	function checkAuthentication(req, res, next) {
		if (req.isAuthenticated()) {
			console.log("_____ " + req.user.username + " _____");
			next();
		} else {
			req.flash('loginMessage', 'Сперва необходимо войти');
			res.status("404").redirect("/login");
		}
	}
	function checkRole(req, res, next) {
		if (req.user.role == "ADMIN") {
			next();
		} else {
			res.redirect("/profile");
		}
	}
	function checkTeam(req, res, next) {
		if (req.user.nameTeam != 'none') {
			next();
		} else {
			res.redirect('/my_team');
		}
	}
	return app;
}
