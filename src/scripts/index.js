const path = require('path');

const scripts = {}; 

const folderPath = path.join(__dirname,'scrapper');
require('fs').readdirSync(folderPath).forEach(function(file){
  const name = file.replace('.js',''); 
  scripts[name] = require('./scrapper/'+file);

});

module.exports = scripts;

