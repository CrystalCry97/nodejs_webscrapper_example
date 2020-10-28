const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const lib = {};

// Base Dir of our log text file
lib.baseDir = path.join(__dirname,'/../.logs/');

lib.append = function(file,str,callback){
 fs.open(lib.baseDir+file+'.log','a',function(error,fd){
  if(!error && fd){
    fs.appendFile(fd,str+'\n',function(error){
      if(!error){
        fs.close(fd,function(error){
          if(!error){
            callback(false);
          }else{
            callback('Error Closing file descriptor');
          }
        });
      }else{
        callback('Error appending to file');
      }
    });
  }else{
    callback('Cannot open file to write log');
  }
 })
}

module.exports = lib;
