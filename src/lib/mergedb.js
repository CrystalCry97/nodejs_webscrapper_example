const ArticleSchema = require('../models/articles');
const lib = {};

lib.mergeCollection = async (connection) => {
  const db = connection[process.env.MONGO_DB_NAME].db;
  const collections = await db.listCollections().toArray();
  const something = await collections.map(function(site){
    const crawlers = connection[process.env.MONGO_DB_NAME].model(site.name,ArticleSchema); 
      crawlers.find({},'title link abstract category year').lean().exec(function(error,result){
        if(error) console.error('Error finding in collections'); 
        if(result){
          const newDb = connection[process.env.MONGO2_DB_NAME].model(site.name,ArticleSchema);
          newDb.insertMany(result,{ordered:false},function(error,docs){
            if(error) console.error('Error Inserting'); 
            if(docs){
              console.log('Inserted...'); 
            }
          });
        }
      }); 
  });  
}
module.exports = lib;
