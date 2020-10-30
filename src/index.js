require('dotenv').config();
const mongoose = require('mongoose');
const scripts = require('./scripts/index');
const {URI,URI2} = require('./configs/mongo');
const errorHandler = require('./lib/errorHandler');
const ArticleSchema = require('./models/articles');
const {mergeCollection} = require('./lib/mergedb');

const app = {};

app.init = async () => {
  app.connection = {};
  await mongoConnect(URI,process.env.MONGO_DB_NAME);
  await mongoConnect(URI2,process.env.MONGO2_DB_NAME);
  return 'MongoInit Completed';
}

const mongoConnect = async (URI,connectionName) =>{
 try{
   const connection = await mongoose.createConnection(URI); 
   app.connection[connectionName] = connection;
   console.log('Created Connection:',connectionName);
 }catch(error){
  console.error('Error Creating Connection:',error);
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

//app.mergeData = (collections) =>{
  //try{
    //collections.forEach(function(site){
    //const crawlers = app.connection[process.env.MONGO_DB_NAME].model(site.name,ArticleSchema);
    //crawlers.find({},'title link abstract category year').lean().exec(function(error,result){
      //if(error) throw error;
      //if(result){
        ////copy content to new DB
        //const newDb = app.connection[process.env.MONGO2_DB_NAME].model('crawled',ArticleSchema); //crawled is the collection name
        //newDb.insertMany(result,{ordered:false},function(error,docs){
          //if(error){
            //console.error('Error while inserting into new db');
          //}
          //if(docs){
            //console.log('Insert into new DB gracefully');
          //}
        //});
        
      //}
    //})
    ////console.log(model); 
  //})
  //}catch(error){
    //console.log('Error Captured Here:',error);
  //}
//}

app.run = async () =>{
  await app.init();
  mergeCollection(app.connection);

  
 
}

app.run();

