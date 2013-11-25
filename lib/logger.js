var winston = require('winston');
var config = require('config');

// TODO
// add transport settings

var logger = module.exports = winston;

// Pipe all Express log output to Winston
logger.logStream = {
  write: function(msg){
    // strip duplicate newlines from the end of Express log messages
    msg = msg.substr(0, msg.length - 1);
    logger.info(msg);
  }
};


