module.exports = function(app){

  app.all(/^\/db\/(.+)$/, function(req, res){
    var path = req.params[0];
    var method = req.method && req.method.toLowerCase();
    var token = JSON.parse(req.get('x-auth'));
    if( !token ){
      return res.json(500);
    }
    req.couch.token = token;

    var cb = function(err, resp, data){
      if( err ){
        return res.json(500, { error: err });
      }
      res.json(resp.statusCode, data);
    };

    if( req.couch[method] ){
      if( method === 'get' || method === 'del' ){
        req.couch[method](path, cb);
      } else {
        req.couch[method](path, req.body, cb);
      }
    } else {
      res.json(500);
    }
  });

};
