var Q = require('q');
var config = require('config');
var userValidate = require('npm-user-validate');
var CouchLogin = require('couch-login');


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
      return res.json(500, { error: errors });
    }

    var response = {
      email: req.body.auth.name,
      database: name
    };

    Q.nfcall(req.nano.request, {
      path: '_users/org.couchdb.user:'+user.name,
    })
    .then(function(resp, body){
      // Log user in if account exitsts
      return Q.ninvoke(res.couch, 'login', user);
    }, function(err, resp){
      if( err.status_code !== 404 ){
        console.log(resp);
        console.error('unexpected error with user lookup', err);
        throw new Error(err);
      }

      // Sign up User
      return Q.ninvoke(basicCouchLogin, 'signup', user).then(function(resp, body){
        // console.log('signup succesful', body, res.couch);
        return Q.ninvoke(res.couch, 'login', user).then(function(resp, body){
          // console.log('sign in successful', body, res.couch);
          return Q.nfcall(req.nano.db.create, name +'_stickies');
        });
      });
    })
    .then(function(resp, body){
      if( res.couch.token ){
        response.cookie = res.couch.token;
      }
      if( body && body.error ){
        return res.json(resp.statusCode, body);
      }
      return res.json(response);
    })
    .fail(function(err){
      console.error(err);
      return res.json(500, { error: err });
    });

  });

};
