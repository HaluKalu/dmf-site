const nodemailer = require('nodemailer');
var EmailLogs = require('../routes/models/emailLogs.js');


const transporter = nodemailer.createTransport({
	service: 'mail.ru',
	auth: {
		user: 'info@dmf-imit.ru',
		pass: 's6v5ECRJo!fw'
	}
});

var mailOptions = {
	from: '"DMF IMIT VolSU" <info@dmf-imit.ru>', // sender address
	to: '', // list of receivers
	subject: '', // Subject line
	html: ''// HTML text body
};

module.exports = function (to = '"DMF³ | Регистрация" <info@dmf-imit.ru>', subject = "Welcome message", html = "<p> Test message! </p>") {
	let currentOptions = mailOptions;
	currentOptions.to = to;
	currentOptions.subject = subject;
	currentOptions.html = html;
	transporter.sendMail(currentOptions, function (err, info) {
		var newLogs = new EmailLogs();
		newLogs.error = JSON.stringify(err);
		newLogs.info = JSON.stringify(info);
		if (err) {
			console.log(`Ошибка отправки сообщения на почту ${to}`);
		}
		newLogs.save();
	});
}