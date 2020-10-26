require('dotenv').config();
const mongoose = require('mongoose');
const scripts = require('./scripts');
const mongoURL = require('./configs/mongo');
const errorHandler = require('./lib/errorHandler');

const app = {};

app.run = () =>{
  Object.values(scripts).forEach(function(site){
    try{
      site.Model = mongoose.model(site.name,ArticleSchema);
      site.crawl();
    }catch(error){
      //errorHandler,
      errorHandler.scriptError(error);
      //console.error('ScriptsError:',error);
    }
  });
}

// create new mongoose connection
mongoose.connect(mongoURL,{useNewUrlParser:true});
const db = mongoose.connection;
db.on('error',console.error.bind(console,'MongoDB connection Error'));
db.once('open',function(){
  //run the scripts;
  app.run();
});
