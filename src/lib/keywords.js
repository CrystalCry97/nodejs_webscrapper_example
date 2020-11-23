const fs = require('fs')
const path = require('path');

const lib = {}

lib.baseDir = path.join(__dirname,'../keywords.txt');

lib.loadAsync = function(){
  try{
    console.log('Reading from:',this.baseDir);
    fs.readFile(this.baseDir, function(error,fd){
      if(error) throw error;
      if(!error && fd){
        var keyList = fd.toString();
        lib.keywords = fd.toString().split('\n');
        console.log(keyList);
      }
    })
  }catch(error){
    console.error(error);
  }finally{
    console.log('keywords:',lib.keywords);
  }
}

lib.load = function(){
  var keyList = fs.readFileSync(this.baseDir,'utf8').split('\n');
  //console.log('Keywords:',keyList.pop());
  keyList.pop(); //pop the last '' in the array
  return keyList;
}

module.exports = lib;
