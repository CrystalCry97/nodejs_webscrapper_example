require('dotenv').config();
const mongoose = require('mongoose');
const scripts = require('./scripts/index');
const mongoURL = require('./configs/mongo');
const errorHandler = require('./lib/errorHandler');
const ArticleSchema = require('./models/articles');

const app = {};

app.run = async () =>{ 
  await Object.values(scripts).map(async function(site){
    try{
      console.log('SITE:',site);
      site.Model = mongoose.model(site.name,ArticleSchema);
      console.log('Info:',site.info);
      await site.crawl();
      return Promise.resolve("Done"); 
    }catch(error){
      //errorHandler,
      errorHandler.scriptError(error);
      //console.error('ScriptsError:',error);
    }
  });  
  return Promise.resolve(1);
}

console.log('MONGO_URL:',mongoURL);
// create new mongoose connection
mongoose.connect(mongoURL,{useNewUrlParser:true});
const db = mongoose.connection;
db.on('error',console.error.bind(console,'MongoDB connection Error'));
db.once('open',function(){
  //run the scripts; 
  const done  = app.run();
  if(done ===1){
    console.log('DONE...');
    process.exit(0);
  }

});

