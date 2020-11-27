const path = require('path');

const scripts = {}; 
//scripts['acspub'] = require('./scrapper/acspub');

const folderPath = path.join(__dirname,'scrapper');
require('fs').readdirSync(folderPath).forEach(function(file){
  if(file.match(/\.js$/) !== null ){
    const name = file.replace('.js',''); 
    scripts[name] = require('./scrapper/'+file);
  }

});
module.exports = scripts;

