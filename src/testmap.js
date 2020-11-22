require('dotenv').config();
const mongoose = require('mongoose');
const scripts = require('./scripts/index');
const {URI,URI2} = require('./configs/mongo');
const errorHandler = require('./lib/errorHandler');
const ArticleSchema = require('./models/articles');
const {mergeCollection} = require('./lib/mergedb');
const _log = require('./lib/log');

//require('events').EventEmitter.setMaxListeners(100);
require('events').EventEmitter.defaultMaxListeners = 65;

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
  const con1 = app.connection[process.env.MONGO_DB_NAME];
  const errors = [];
 
    try{
      await Promise.all(Object.values(scripts).map(async (site)=>{
        try{
          console.log('Crawling..:',site);
          site.Model = con1.model(site.name,ArticleSchema);
          await site.crawl();
        }catch(error){
          //doing comething with error;
          console.log('Adoiiiii...');
          console.error(error);
        }
           
      }));
      //for ( let i = 0; i < Object.values(scripts).length; ){
        //const site = Object.values(scripts)[i];
        //console.log('Crawling..:',site);
        //site.Model = con1.model(site.name,ArticleSchema);
        //await site.crawl();
        //i++;
      //}
    }catch(error){
      console.log('Error while crawling...');
      console.log('Error:',error);
      errors.push(error);
    }finally{
      //await mergeCollection(app.connection); 
      console.log('Done maybe .. ?');
    } 
}


app.run = async () =>{
  try{
    app.connection = await init();
    console.log('received connection..');
    await app.crawl();
    console.log('Finished crawling');
    await mergeCollection(app.connection);
  }catch(error){
    console.error('We Found Error...');
    console.error('Error are:',error);
    //process.exit(1);
  }finally{
    const filename = 'finished';
    const payload = JSON.stringify({status:'finished...',time: new Date()});
    _log.append(filename,payload,function(error){
      if(error){
        console.log('Error wrinting logs');
        process.exit(1);
      }else{
        process.exit(0);
      }
    });
    //process.exit(0);
  } 
}

app.run();

