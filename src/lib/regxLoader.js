const fs = require('fs');
const path = require('path');

const lib = {};

lib.baseDir = path.join(__dirname,'../regexs/');

lib.buildRegex = function (regxStr){
  if(typeof regxStr !== 'string') throw new Error('Regex input is not a string');
  const r = regxStr.match(/(\/)(.+)\1([gimsuy]*)/i); //parse regex from /expression/flag, into groups
  return new RegExp(r[2],r[3]); // return (check got flags) ? new RegExp(regxStr) : new RegExp(r[2],r[3]);
}

lib.load = function(filename){
  try{
    const regList = fs.readFileSync(this.baseDir+filename,'utf8').split('\n');
    regList.pop(); //remove empty '',
    const regex = regList.map((rgx)=>lib.buildRegex(rgx));
    return regex;
  }catch(error){
    console.error(error);
    return null;
  }
}

module.exports = lib;
