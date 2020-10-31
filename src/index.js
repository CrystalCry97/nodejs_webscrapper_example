require('dotenv').config();
const mongoose = require('mongoose');
const scripts = require('./scripts/index');
const {URI,URI2} = require('./configs/mongo');
const errorHandler = require('./lib/errorHandler');
const ArticleSchema = require('./models/articles');
const {mergeCollection} = require('./lib/mergedb');

const app = {};

const init = async () => {
  const connection = {};
  try{
    connection[process.env.MONGO_DB_NAME] = await mongoConnect(URI,process.env.MONGO_DB_NAME);
    connection[process.env.MONGO2_DB_NAME] = await mongoConnect(URI2,process.env.MONGO2_DB_NAME);
    console.log('Created connection');
    return Promise.resolve(connection);
  }catch(error){
    return Promise.reject(error);
  }
}

const mongoConnect = async (URI,connectionName) =>{
 try{
   const connection = await mongoose.createConnection(URI); 
   console.log('Created Connection:',connectionName);
   return Promise.resolve(connection);
 }catch(error){
    console.error('Error Creating Connection:',error);
    return Promise.reject(error);
 } 
}

app.crawl = async () =>{ 
  await Object.values(scripts).map(async function(site){
    try{
      console.log('SITE:',site);
      site.Model = con1.model(site.name,ArticleSchema);
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


app.run = async () =>{
  try{
    app.connection = await init();
    console.log('received connection..');
    await mergeCollection(app.connection); 
  }catch(error){
    console.error('We Found Error...');
    process.exit(1);
  }finally{
    process.exit(0);
  } 
}

app.run();

