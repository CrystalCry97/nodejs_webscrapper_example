require('dotenv').config();
const mongoose = require('mongoose');
const scripts = require('./scripts/index');
const {URI,URI2} = require('./configs/mongo');
const errorHandler = require('./lib/errorHandler');
const ArticleSchema = require('./models/articles');
const _log = require('./lib/log');
const path = require('path');

const app = {};

app.init = async () => {
  app.connection = {};
  await mongoConnect(URI,'crawlers');
  await mongoConnect(URI2,'amalwebserver');
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

app.run = async () =>{ 
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

app.mergeData = (collections) =>{
  try{
    collections.forEach(function(site){
    const crawlers = app.connection['crawlers'].model(site.name,ArticleSchema);
    crawlers.find().lean().exec(function(error,result){
      if(error) throw error;
      if(result){
        const jsonRes = JSON.stringify(result);
        //testing write to file;
        const filename = `${site.name}.js`;
        _log.baseDir = path.join(__dirname,'./Collection/');
        console.log('Location:',_log.baseDir);
        _log.append(filename,jsonRes,function(error){
          if(!error){
            console.log('Collection Written to File');
          }else{
            console.error(error);
          }
        });

      }
    })
    //console.log(model); 
  })
  }catch(error){
    console.log('Error Captured Here:',error);
  }
}

app.run = async () =>{
  await app.init();
  const db = app.connection['crawlers'].db;
  const collections = await db.listCollections().toArray();
  await app.mergeData(collections);
 
}

app.run();

