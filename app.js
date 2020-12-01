var createError      =  require('http-errors');
var express          =  require('express');
var session          =  require('express-session');
const fileUpload = require('express-fileupload');
var path             =  require('path');
var cookieParser     =  require('cookie-parser');
var logger           =  require('morgan');
var passport         =  require('passport');
var flash            =  require('connect-flash');
var mongoose         =  require('mongoose');
const MongoStore = require('connect-mongo')(session); 

const dbConfig = require('./config/db');

mongoose.connect(dbConfig.url, { useNewUrlParser: true });

var app = express();

app.use(fileUpload());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(session({
  secret: 'dfghjuty54erdfghyu765redfghgyu7654ersdfghyu7i8654rewqsdsfghjkio',
  saveUninitialized: false, // don't create session until something stored
  resave: true, //don't save session if unmodified
  store: new MongoStore({
    url: dbConfig.url,
    touchAfter: 24 * 3600 // time period in seconds
  })
}));

require("./config/passport")(passport);

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.use(logger('common'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var indexRouter = require('./routes/index')(passport);
var teamRouter = require('./routes/team')(passport);
var adminRouter = require('./routes/admin')(passport);

app.use('/', indexRouter);
app.use('/team', teamRouter);
app.use('/admin', adminRouter);

app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  console.log(err);
  res.status(err.status || 500);
  res.render('error', {isAuth: req.isAuthenticated()});
});

module.exports = app;
