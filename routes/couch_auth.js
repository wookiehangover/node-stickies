var userValidate = require('npm-user-validate');

function formatName(name){
  return name.toLowerCase().replace(/@/, '-at-').replace(/\./g,'-dot-');
}

module.exports = function(app){

  app.post('/auth', function(req, res){
    var errors = [];
    var user = req.body.auth;

    userValidate.email(user.name) && errors.push(userValidate.email(user.name));
    userValidate.pw(user.password) && errors.push(userValidate.pw(user.password));

    if( errors.length ){
      return res.json(500, { error: errors });
    }

    req.couch.signup(user, function(err, resp, body){
      if( err ){
        return res.json(500, { error: err });
      }

      var name = formatName(req.body.auth.name);

      var response = {
        email: req.body.auth.name,
        database: name,
      };

      var onSuccess = function(err, resp, body){
        if( err){
          return res.json(500, { error: err || body });
        }

        if( res.couch.token ){
          response.cookie = res.couch.token;
        }

        if( body && body.error ){
          return res.json(resp.statusCode, body);
        }

        res.json(response);
      };

      console.log(resp.statusCode, body)

      if( resp.statusCode === 409 ){
        res.couch.login(user, onSuccess);
      } else {
        req.nano.db.create(name + '_stickies', onSuccess);
      }

    });
  });

};
