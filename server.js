
/*
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var cors = require('cors');
var CouchLogin = require('couch-login');
var nano = require('nano');
var config = require('config');
var whitelist = config.whitelist;
var logger = require('./lib/logger');

/*
 * Application init
 */
var app = express();

var couchLogin = new CouchLogin(config.COUCH_URL);
var couchAdapter = nano(config.COUCH_URL);

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.logger({ stream: logger.logStream, format: 'dev' }));

  app.use(cors({
    origin: function(origin, cb){
      var whitelisted = whitelist.indexOf(origin) !== -1;
      cb(null, whitelisted);
    },
    credentials: true
  }));

  app.use(function(req, res, next){
    couchLogin.decorate(req, res);
    req.nano = couchAdapter;
    req.logger = res.logger = logger;
    next();
  });

  app.use(express.json());
  app.use(express.urlencoded());
  app.use(app.router);

  // frontend application
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
  app.use(express.static(path.join(__dirname)));
});

/*
 * Route Map
 */


var routes = {};
routes.couch_auth = require('./routes/couch_auth');
routes.couch_proxy = require('./routes/couch_proxy');

app.get('/', function(req, res){
  res.json(501, { error: 'Not implemented'});
});

routes.couch_auth(app);
routes.couch_proxy(app);

http.createServer(app).listen(app.get('port'), function(){
  logger.info("Express server listening on port " + app.get('port'));
});

