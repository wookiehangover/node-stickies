var Q = require('q');
var config = require('config');
var userValidate = require('npm-user-validate');
var CouchLogin = require('couch-login');
var logger = require('../lib/logger');


function parseCookie(sc){
  if (!sc) return

  sc = sc.filter(function (c) {
    return c.match(/^AuthSession=/)
  })[0]

  if (!sc.length) return

  sc = sc.split(/\s*;\s*/).map(function (p) {
    return p.split('=')
  }).reduce(function (set, p) {
    var k = p[0] === 'AuthSession' ? p[0] : p[0].toLowerCase()
    , v = k === 'expires' ? Date.parse(p[1])
        : p[1] === '' || p[1] === undefined ? true // HttpOnly
        : p[1]
    set[k] = v
    return set
  }, {})

  return sc;
}

function formatName(name){
  return name.toLowerCase().replace(/@/, '-at-').replace(/\./g,'-dot-');
}

module.exports = function(app){
  var basicCouchLogin = new CouchLogin(config.COUCH_URL, 'basic');

  app.post('/auth', function(req, res){
    var errors = [];
    var user = req.body.auth;
    var name = formatName(req.body.auth.name);

    userValidate.email(user.name) && errors.push(userValidate.email(user.name));
    userValidate.pw(user.password) && errors.push(userValidate.pw(user.password));

    if( errors.length ){
      logger.error(errors);
      return res.json(500, { error: errors });
    }

    var response = {
      email: req.body.auth.name,
      database: name
    };

    Q.nfcall(req.nano.request, {
      path: '_users/org.couchdb.user:'+user.name,
    })
    .then(
      function(resp, body){
        // Log user in if account exitsts
        return Q.nfcall(req.nano.auth, user.name, user.password);
      },
      function(err, resp){
        if( err.status_code !== 404 ){
          logger.debug(resp);
          logger.error('unexpected error with user lookup', err);
          throw new Error(err);
        }

        // Sign up User
        return Q.ninvoke(basicCouchLogin, 'signup', user)
          .then(function(resp, body){
            logger.debug('signup succesful', body, res.couch);
            logger.debug('sign in successful', body, res.couch);
            return Q.nfcall(req.nano.db.create, name +'_stickies');
          });
    })
    .then(function(resp, body, headers){
      if( res.couch.token ){
        response.cookie = res.couch.token;
      }
      if( resp && resp[1] && resp[1]['set-cookie'] ){
        response.cookie = parseCookie(resp[1]['set-cookie']);
      }
      if( body && body.error ){
        return res.json(resp.statusCode, body);
      }
      return res.json(response);
    })
    .fail(function(err){
      logger.error(err);
      return res.json(500, { error: err });
    });

  });

};
