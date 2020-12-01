var AuthLocalStrategy = require('passport-local').Strategy;

var User = require('../routes/models/user');
const mailTransporter = require('./mail.js');

module.exports = function (passport) {

	passport.serializeUser(function (user, done) {
		done(null, user.id);
	});

	passport.deserializeUser(function (id, done) {
		User.findById(id, function (err, user) {
			done(err, user);
		});
	});

	passport.use('local-login', new AuthLocalStrategy({
		usernameField: 'login',
		passwordField: 'password',
		passReqToCallback: true
	},
		function (req, login, password, done) {
			process.nextTick(function () {
				login = req.body.login.trim();
				User.findOne({ 'username': login }, function (err, user) {
					if (err)
						return done(err);
					if (!user)
						return done(null, false, req.flash('loginMessage', 'Пользователь не найден'));
					if (!user.validPassword(password))
						return done(null, false, req.flash('loginMessage', 'Некорректный пароль.'));
					else
						return done(null, user);
				});
			});
		}));

	// регистрация
	passport.use('local-signup', new AuthLocalStrategy({
		usernameField: 'login',
		passwordField: 'password',
		passReqToCallback: true //возвращает весь запрос на обратный вызов
	},
		function (req, login, password, done) {
			process.nextTick(function () {
				if (!req.user) {
					User.findOne({ 'username': login.trim() }, function (err, user) {
						if (user) {
							return done(null, false, req.flash('signupMessage', 'Логин уже занят.'));
						}
						else {
							var ref = "halukalu";
							if (req.body.ref) {
								ref = req.body.ref;
							}
							var newUser = new User();
							newUser.username = req.body.login.trim();
							newUser.password = newUser.generateHash(password);
							newUser.f_name = req.body.name.trim();
							newUser.l_name = req.body.fam.trim();
							newUser.institut = req.body.inst;
							newUser.group = req.body.group.toUpperCase().trim();
							newUser.email = req.body.email.trim();
							newUser.ref = ref;
							let html = `
											<h2> Добро пожаловать на сайт Института Математики и Информационных технологий ко Дню МатФака. </h2>
											<h3 style="color: red;"> Данный сайт не является официальным и несёт в себе только развлекательный характер. </h3>
											<br>
											<p> На всякий случай сообщаем тебе твой логин и пароль, чтобы ты его не забывал: 
											<br>
											Логин: ${newUser.username}
											<br>
											Пароль: ${password}
											<br>
											<h4> Краткую информацию для этого сайта ты можешь прочитать <a href="dmf-imit.ru/faq">по ссылке</a><h4>
											<h4> А это <i> dmf-imit.ru/reg?ref=${newUser.username} </i> твоя реферальная ссылка. Отправляй её друзьям и получишь бонусы на ДМФ </h4>
											<p> Если у тебя есть какие-то вопросы, то смело пиши мне в вк: <a href="https://vk.com/halukalu">Дима Солонин</a> </p>
												`
							newUser.save(function (err) {
								if (err) {
									return done(err);
								} else {
									mailTransporter(newUser.email, "Registration", html);
									return done(null, newUser);
								}
							});
						}
					});
				} else {
					// пользователь вошел в систему и имеет локальную запись. игнорирование регистрации.
					//прежде чем создать новую учетную запись необхожимо выйти из системы
					return done(null, req.user);
				}
			});
		}));
};
