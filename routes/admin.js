var express = require('express');
var app = express.Router();
var mongoose = require("mongoose");
var crypto = require('crypto');
var bcrypt = require('bcrypt-nodejs');
var moment = require('moment')
var path = require('path');
var fs = require("fs");

var Users = require('../routes/models/user.js');
var Trx = require('../routes/models/trx.js');
var Team = require('../routes/models/team.js');
var Vote = require('../routes/models/vote.js');
var Ach = require('../routes/models/achivements.js');
var News = require('../routes/models/news.js');

var mailTrans = require('../config/mail.js');

const capitalize = (s) => {
	if (typeof s !== 'string') return ''
	return s.charAt(0).toUpperCase() + s.slice(1)
}

module.exports = function (passport) {
	app.use(checkAuthentication, checkRole);

	app.get('/update_profile', function (req, res) {
		Users.findOne({ "username": req.query.adm }, function (err, re) {
			if (!re) {
				res.send("WTF?! Who are u?"); return;
			} else if (re.role != "ADMIN") {
				res.send('Вы не являетесь админинстратором.')
			} else if (req.query.login == "halukalu") {
				res.send("Охренел что ли трогать разраба сайта?!");
				return;
			} else {
				if (req.query.role == "Пользователь")
					Users.findOneAndUpdate({ "username": req.query.login }, { "role": "USER" }, { upsert: false }, function (err, doc, re) { });
				else if (req.query.role == "Администратор")
					Users.findOneAndUpdate({ "username": req.query.login }, { "role": "ADMIN" }, { upsert: false }, function (err, doc, re) { });
				else if (req.query.role == "Организатор")
					Users.findOneAndUpdate({ "username": req.query.login }, { "role": "ORG" }, { upsert: false }, function (err, doc, re) { });
				res.send("OK");
			}
		})
	});

	app.get('/teams', function (req, res) {
		if (req.user.role == "ADMIN") {
			Team.find({}, function (err, re) {
				res.render('admin/teams', { teams: re });
			})
		} else {
			res.redirect('/profile');
		}
	});

	app.get('/users', function (req, res) {
		if (req.user.role == "ADMIN")
			Users.find(function (err, users) {
				res.render('admin/users_accept', { users: users });
			});
		else
			res.redirect('/profile');
	});

	app.post('/users_accept/:id', function (req, res) {//Принятие заявки
		Users.findOneAndUpdate({ "username": req.params.id }, { "verify": true }, { upsert: true }, function (err, doc, re) {
			res.send("Ok");
		});
	});

	app.post('/users_reject/:id', function (req, res) {//Отклонение заявки 
		Users.findOneAndUpdate({ "username": req.params.id }, { "verify": false }, { upsert: true }, function (err, doc, re) {
			res.send("Ok");
		});
	});

	app.get('/transactions', function (req, res) {
		if (req.user.role == "ADMIN")
			Trx.find(function (err, trx) {
				res.render('admin/transaction', { trx: trx.reverse() });
			});
		else res.redirect('/profile');
	});

	app.post('/give_tokens', function (req, res) {
		if (req.user.role === "ADMIN") {
			var tokens = req.user.tokens + parseFloat(req.body.tokens);
			Users.findOneAndUpdate({ "username": req.user.username }, { "tokens": tokens }, { upsert: true }, function (err, doc, re) { });
		}
		res.redirect('/profile');
	});

	app.get('/removeuser/:id', function (req, res) {
		Users.findOne({ 'username': req.params.id }, (err, usr) => {
			if (!usr) {
				res.json({ 'status': 'ERROR', msg: "User not found" });
			} else {
				Users.findOneAndRemove({ 'username': req.params.id }, (err, dt) => { console.log(err, dt); res.json({ 'status': 'OK' }); });
			}
		});
	});

	app.get('/achivements', function (req, res) {
		Ach.find({}, (err, ach) => {
			res.render('admin/achivements', { achivements: ach });
		});
	});
	app.post('/achivements', function (req, res) {
		const title = req.body.title || "Title";
		const descr = req.body.descr || "Default text";
		const rnd = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
		var names = "";
		var img = "";
		if (!req.files || Object.keys(req.files).length === 0) {
			names = "https://picsum.photos/200";
			img = "https://picsum.photos/200";
		} else {
			names = req.files.img.name.split('.');
			req.files.img.mv(__dirname + `/../public/images/${rnd}.${names[names.length - 1]}`, (err)=>{console.log(err);});
			img = `/images/${rnd}.${names[names.length - 1]}`;
		}
		var ach = new Ach({ title: title, text: descr, img: img, rnd: rnd });
		ach.save();
		res.redirect('/admin/achivements');
	});
	app.post('/achivements/user/update', function(req, res){
		console.log(req.body);
		const msg = req.body;
		// Users.findOneAndUpdate({'username': msg.user}, )
		Users.findOneAndUpdate({ "username": msg.user }, { achivements: msg["achivements[]"] }, { upsert: false }, function (err, doc, re) { });
		res.json({status: 'OK', msg: 'none'});
	});
	app.get('/achivements/delete/:id', function (req, res) {
		Ach.findOneAndRemove({ '_id': req.params.id }, (err, tmp) => {
			if (!tmp) {
				res.json({ status: 'ERROR', msg: 'Not found' });
			} else {
				console.log(tmp);
				fs.unlink(__dirname + `/../public${tmp.img}`, function(){});
				res.json({ status: 'OK', msg: "Removed" });
			}
		});
	});
	app.get('/news', function(req, res){
		News.find({}, (err, news)=>{
			res.render('admin/news', {news:news});
		});
	});

	app.post('/news', function(req, res){
		const title = req.body.title;
		const fullDescr = req.body.content;
		const publ = req.body.publication;
		var news = new News({title: title, publ:publ, fullDescr: fullDescr});
		news.save();
		res.json({status: 'OK'});
	});
	app.get('/news/delete/:id', function(req, res){
		News.findOneAndRemove({'_id': req.params.id}, (err, result)=>{
			console.log(err, result);
			if(result){
				res.json({'status':'OK'});
			} else {
				res.json({'status':'ERROR', msg: 'Not found'});
			}
		});
	});
	app.get('/news/edit/:id', function(req, res){
		News.findOne({'_id':req.params.id}, (err, re)=>{
			res.render('admin/news_id', {news:re});
		});
	});
	app.post('/news/edit/:id', function(req, res){
		const title = req.body.title;
		const fullDescr = req.body.content;
		const publ = req.body.publication;
		News.findOneAndUpdate({'_id':req.params.id}, {title: title, publ:publ, fullDescr: fullDescr}, {upsert: false}, (err, doc, re)=>{
			if(!err){
				res.json({'status':"OK"});
			} else {
				res.json({'status':"OK", msg: err});
			}
		});
	});
	//Start voting
	/*
		app.post('/start_vote', checkAuthentication, checkRole, function (req, res) {
			News.findOneAndUpdate({ 'name': 'voting' }, { 'publ': true }, { upsert: true }, function (err, doc, ret) { res.send("Время пошло...") });
		});
		app.get('/news/voting', checkAuthentication, function (req, res) {
			Vote.find({}, function (err, re) {
				if (req.user.alr == undefined) {
					Users.findOneAndUpdate({ 'username': req.user.username }, { 'alr': false }, function (err, doc, ret) { res.render('vote.ejs', { me: req.user, vote: re }); })
				} else {
					res.render('vote.ejs', { me: req.user, vote: re });
				}
			});
		});
		app.get('/createVote', checkAuthentication, checkRole, function (req, res) {
			Vote.find({}, function (err, re) {
				res.render('crVt', { me: req.user, vote: re })
			})
		});
		app.post('/createVote', checkAuthentication, checkRole, (req, res) => {
			var vt = new Vote();
			vt.imgPath = req.body.imgPath;
			vt.txt = req.body.txt;
			vt.votes = 0;
			vt.save();
			res.redirect('/createVote');
		});
		app.get('/vote/:id', checkAuthentication, function (req, res) {
			var vt = req.params.id;
			Users.findOneAndUpdate({ 'username': req.user.username }, { 'alr': true }, function (err, doc, ret) { });
			Vote.findOne({ "_id": req.params.id }, function (err, re) {
				// console.log(err, re);
				if (!re) {
					console.log('ERROR');
					res.redirect('/news/voting');
				} else {
					Vote.findOneAndUpdate({ '_id': vt }, { 'votes': re.votes + 1 }, function (err, doc, ret) { });
					res.redirect('/news/voting');
				}
			});
  
  
		});
		//End voting
  
		app.get('/bank', checkAuthentication, checkRole, function (req, res) {
			Users.find({ "verify": true }, function (err, re) {
				res.render('bank', { me: req.user, users: re });
			});
		});
  
		app.get('/bank/:id/', checkAuthentication, checkRole, function (req, res) {
			var id = req.params.id;
			Users.findOne({ 'username': id }, function (err, re) {
				var g_w = [30, 45, 30, 10, 30, 20, 5, 15, 10, 20, 10, 40, 20];
				var g_u = [20, 30, 20, 5, 20, 15, 5, 10, 5, 15, 5, 15, 10];
				var gms = ["Угадай",
					"Мафия",
					"Хардстоун",
					"Дженго",
					"Уно",
					"Элиас",
					"Загс",
					"Твистер",
					"Русская",
					"Вотерпонг",
					"Гоночоная",
					"Дуэль",
					"Волейбол"]
				var gm = Number(req.query.game);
				console.log(gm);
				var win = req.query.win;
				var tok = 0;
				var val = Number(req.query.val);
				if (win) tok = g_w[gm]; else tok = g_u[gm];
				tok = tok * val;
				var tr1 = new Trx(), tr2 = new Trx();
				tr1.username_to = re.ref;
				tr2.username_to = id;
				tr1.username_from = "БАНК";
				tr2.username_from = "БАНК";
				tr1.token = Math.ceil(tok * 0.05);
				tr2.token = tok;
				tr2.comment = gms[gm] + " at: " + moment().format("DD.MM в kk:mm:ss");
				tr1.comment = "ref from " + id + " at: " + moment().format("DD.MM в kk:mm:ss");
				tr1.save(); tr2.save();
  
				Users.findOneAndUpdate({ 'username': re.ref }, { $inc: { 'tokens': Math.ceil(tok * 0.05) } }, function (err, doc, ret) { });
				Users.findOneAndUpdate({ 'username': id }, { $inc: { 'tokens': tok } }, function (err, doc, ret) { });
  
			});
			res.send('OK');
		});
	*/
	function isLoggedIn(req) {
		return req.isAuthenticated();
	}
	function checkAuthentication(req, res, next) {
		if (req.isAuthenticated()) {
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
	return app;
}
