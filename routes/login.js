module.exports = function(app){

  app.post('/login', function(req, res){
    req.couch.login(req.body.auth, function(err, resp, body){
      if( err ){
        return res.json(500, { error: err });
      }
      var name = req.body.auth.name
                  .toLowerCase()
                  .replace(/@/, '-at-')
                  .replace(/\./,'-dot-');

      res.json({
        database: name,
        cookie: res.couch.token
      });
    });
  });

};
