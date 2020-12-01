var express = require('express');
var app = express.Router();
var mongoose = require("mongoose");
var crypto = require('crypto');
var bcrypt = require('bcrypt-nodejs');
var moment = require('moment')

var Users = require('../routes/models/user.js');
var Trx = require('../routes/models/trx.js');
var Team = require('../routes/models/team.js');
var News = require('../routes/models/news.js');
var Vote = require('../routes/models/vote.js');
var Ach = require('../routes/models/achivements.js');

var mailTrans = require('../config/mail.js');

const maxUsersInTeam = 11;
/*
  function mask(arr, str) { //arr - orig, str - temp string
    // console.log(arr, str);
    for (i = 0; i < arr.length; i++) {
      var tmp = arr[i];
      if (tmp.length == str.length) {
        var check = true;
        for (j = 0; j < tmp.length; j++) {
          if (tmp[j] == '0' || tmp[j] == 'o') {
            if (str[j] == '0' || str[j] == 'o') {
              check = true;
            } else {
              check = false;
              break;
            }
          } else if (tmp[j] == '9' || tmp[j] == 'q' || tmp[j] == 'g') {
            if (str[j] == '9' || str[j] == 'q' || str[j] == 'g') {
              check = true;
            } else {
              check = false;
              break;
            }
          } else if (tmp[j] == 'i' || tmp[j] == 'l' || tmp[j] == '1') {
            if (str[j] == 'i' || str[j] == 'l' || str[j] == '1') {
              check = true;
            } else {
              check = false;
              break;
            }
          } else if (tmp[j] == 'u' || tmp[j] == '4') {
            if (tmp[j] == 'u' || tmp[j] == '4') {
              check = true;
            } else {
              check = false;
              break;
            }
          } else {
            if (tmp[j] != str[j]) {
              check = false;
              break;
            }
          }
        }
        if (check) {
          return true;
        }
      }
    }
    return false;
  }
  function maskStr(str1, str2) {
    return mask([str1], str2);
  }
*/

const capitalize = (s) => {
  if (typeof s !== 'string') return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

module.exports = function (passport) {
  app.get('/', function (req, res, next) {
    res.render('index', { title: 'DMF³', isAuth: isLoggedIn(req) });
  });
  app.get('/policy', function (req, res, next) {
    res.render('policy', { isAuth: isLoggedIn(req) });
  })

  app.get('/doc_get', function (req, res) {
    res.download('public/doc/Obrazets_Raspiski.doc');
  });

  app.get('/reg', function (req, res) {
    if (!isLoggedIn(req)) {
      var ref = "";
      if (req.query.ref !== undefined) ref = req.query.ref;
      res.render('reg', { reff: ref, message: req.flash('signupMessage') });
    }
    else res.redirect('/profile');
  });

  app.post('/reg', passport.authenticate('local-signup', {
    successRedirect: '/profile',
    failureRedirect: '/reg',
    failureFlash: true
  }));

  app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/news',
    failureRedirect: '/login',
    failureFlash: true
  }));
  app.get('/login', function (req, res) {
    if (!isLoggedIn(req))
      res.render('login.ejs', { message: req.flash('loginMessage') });
    else res.redirect('/news');
  });

  app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/login');
  });

  app.get('/forget_password', function (req, res) {
    res.render('forget');
  });

  app.post('/forget', function (req, res) {
    Users.findOne({ 'username': req.body.login }, function (err, tmp) {
      if (!tmp) {
        req.flash('loginMessage', "Пользователь не найден");
        res.redirect('/login');
      } else {
        if (tmp.timeUpd + 1000 * 60 * 30 > Date.now()) {
          req.flash('loginMessage', "С момента последнего обновления не прошло 30 минут. Пожалуйста, повторите попытку позже");
          res.redirect('/login');
        } else {
          var token = crypto.randomBytes(20).toString('hex');
          Users.findOneAndUpdate({ "username": req.body.login }, { "recoveryCode": token, timeUpd: Date.now() }, { upsert: false }, function (err, doc, re) {
            let html = `<p> Ваша ссылка для восстановление пароля: <a href="dmf-imit.ru/forget/${token}">dmf-imit.ru/forget/${token}</a></p>`
            mailTrans(tmp.email, "Восстановление пароля", html);
            req.flash('loginMessage', "Пароль обновлен. Скоро вам придет письмо на почту с ссылкой на восстановление. Если письмо не пришло и также отсутствует в спаме, то обратитесь к vk.com/halukalu");
            res.redirect('/login');
          });
        }
      }
    });
  });

  app.get('/forget/:id', function (req, res) {
    Users.findOne({ 'recoveryCode': req.params.id }, function (err, tmp) {
      if (!tmp) {
        req.flash('loginMessage', "Пользователь не найден");
        res.redirect('/login');
      } else {
        res.render('recover', { user: tmp });
      }
    });
  });

  app.post('/forget/:id', function (req, res) {
    Users.findOne({ 'recoveryCode': req.params.id }, function (err, tmp) {
      if (!tmp) {
        req.flash('loginMessage', "Пользователь не найден");
        res.redirect('/login');
      } else {
        tmp.recoveryCode = "";
        password = req.body.password;
        tmp.password = bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
        tmp.save();
        // Users.findOneAndUpdate({ "recoveryCode": req.params.id }, { "recoveryCode": "" }, { upsert: false }, function (err, doc, re) { });
        req.flash('loginMessage', "Пароль успешно обновлен!");
        res.redirect('/login');
      }
    })
  });

  app.get('/profile', checkAuthentication, function (req, res) {
    user = req.user;
    user.f_name = capitalize(user.f_name);
    user.l_name = capitalize(user.l_name);
    Ach.find({}, (err, achiv) => {
      res.render('profile/profile.ejs', { user: user, achivements: achiv });
    });

  });

  app.get('/profile/:id', checkAuthentication, function (req, res) {
    if (req.user.username == req.params.id) {
      res.redirect('/profile');
    } else {
      Users.findOne({ "username": req.params.id }, function (err, re) {
        Ach.find({}, (err, achiv) => {
          user = re;
          capitalize(user.username);
          user.f_name = capitalize(user.f_name);
          user.l_name = capitalize(user.l_name);
          res.render('profile/profile_id.ejs', { user: user, me: req.user, msg: req.flash('msgg'), achivements: achiv });
        });
      });
    }
  });

  app.get('/team_rating', function (req, res) {
    res.redirect('/rating');
  });

  app.get('/rating', checkAuthentication, function (req, res) {
    res.redirect('rating/users');
  });

  app.get('/rating/users', checkAuthentication, function (req, res) {
    Users.find(function (err, users) {
      for (i = 0; i < users.length; i++)
        for (j = i + 1; j < users.length; j++)
          if (users[i].tokens < users[j].tokens) {
            var tmp = users[i];
            users[i] = users[j];
            users[j] = tmp;
          }
      res.render('rating', { users: users, me: req.user });
    });
  });

  app.get('/rating/institut/:id', checkAuthentication, function (req, res) {
    Users.find({ "institut": req.params.id }, function (err, users) {
      for (i = 0; i < users.length; i++)
        for (j = i + 1; j < users.length; j++)
          if (users[i].tokens < users[j].tokens) {
            var tmp = users[i];
            users[i] = users[j];
            users[j] = tmp;
          }
      res.render('rating', { users: users, me: req.user });
    });
  });

  app.get('/rating/group/:id', checkAuthentication, function (req, res) {
    Users.find({ "group": req.params.id }, function (err, users) {
      for (i = 0; i < users.length; i++)
        for (j = i + 1; j < users.length; j++)
          if (users[i].tokens < users[j].tokens) {
            var tmp = users[i];
            users[i] = users[j];
            users[j] = tmp;
          }
      res.render('rating', { users: users, me: req.user });
    });
  });

  app.get('/search', checkAuthentication, function (req, res) {
    var reg = "\w*" + req.query.search + "\w*";
    var search = new RegExp(reg, 'gmi');
    var users = [];
    Users.find({
      $or: [
        { "username": search },
        { "f_name": search },
        { "l_name": search },
        { "group": search },
        { "institut": search }
      ]
    }, function (err, users) {
      res.render('search', { users: users });
    });
  });

  app.get('/news', checkAuthentication, function (req, res) {
    News.find({publ: true}, function (err, re) {
      res.render('news.ejs', { news: re.reverse() });
    })
  });
  app.get('/news/:id', checkAuthentication, function(req, res){
    News.findOne({'_id':req.params.id}, (err , re)=>{
      res.render('news_id', {news: re});
    });
  });

  app.get('/faq', function (req, res) {
    res.render('faq.ejs', { isAuth: req.isAuthenticated() });
  });

  app.get('/send_tokens', checkAuthentication, function (req, res) {
    Users.findOne({ "username": req.user.username }, function (err, re) {
      if ((re.tokens < Number(req.query.tokens) || Number(req.query.tokens) < 0) && req.user.role != "ADMIN") {
        req.flash('msgg', "Не хватает токенов для отправки");
        res.send('n_t');
      } else {
        Users.findOne({ 'username': req.query.login }, function (err, re) {
          if (!re) {
            req.flash('msgg', "Пользователь не найден");
            res.send("n_f")
            return;
          }
          var tr = new Trx();
          tr.username_to = re.username;
          tr.username_from = req.user.username;
          if (tr.username_from === tr.username_to) {
            res.send('n_u');
            return;
          }
          tr.token = req.query.tokens;
          tr.ref = "";
          tr.comment = "Отправлено " + moment().format("DD.MM в kk:mm:ss");
          tr.save();

          Users.findOneAndUpdate({ "username": req.user.username }, { "tokens": req.user.tokens - Number(req.query.tokens) }, { upsert: false }, function (err, doc, re) { });
          Users.findOneAndUpdate({ "username": re.username }, { "tokens": re.tokens + Number(req.query.tokens) }, { upsert: false }, function (err, doc, re) { });
          req.flash('msgg', "Переведено");
          res.send("ok")
        });
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
