const ArticleSchema = require('../models/articles');
const lib = {};

lib.mergeCollection = async (connection,callback) => {
  //const func = this.mergeCollection;
  //if(callback === undefined){
    //return new Promise(function(resolve,reject){
      //func(connection,function(error,result){
        //(error.length > 0) ? reject(error) : resolve(result)
      //});
    //});
  //}
   await new Promise(async function(resolve,reject){
    const errors = [];
    try{
      const db = connection[process.env.MONGO_DB_NAME].db;
      const newDb = connection[process.env.MONGO2_DB_NAME].model('crawled',ArticleSchema);
      const collections = await db.listCollections().toArray();
      console.log('Starting...');
      for ( let i= 0 ; i < collections.length; ){
        const site = collections[i];
        //console.log('Inserting...');
        //console.log('Site:',site);
        const crawlers = connection[process.env.MONGO_DB_NAME].model(site.name,ArticleSchema);
        const results = await crawlers.find({},'title link abstract category year').lean().exec();
        newDb.insertMany(results,{ordered:false},function(error,docs){
          if(error) {
            console.error('Error Inserting...');
            errors.push(error);
          }
          else{
            console.log('Inserting...');
          }
        });
        i++;
      }
      console.log('Is This Done?');
    }catch(error){
      errors.push(error);

    }finally{
      console.log('Is this the end?...');
      console.log('ERRORS:',errors.length);
      (errors.length < 1 ) ? resolve('sucess') : reject( new Error('Got Error'));

    }
     console.log('I should be waiting for errors...');
  });
}
module.exports = lib;
