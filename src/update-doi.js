require('dotenv').config();
const mongoose = require('mongoose');
const {URI2} = require('./configs/mongo');
const ArticleSchema = require('./models/articles');
const {getHTML} = require('./lib/crawler');

const app = {};

const init = async function () {
  try{
    console.log('Connecting..');
    app.connection = await mongoose.createConnection(URI2);
    app.model = app.connection.model('articles',ArticleSchema);
    Promise.resolve('created');
  }catch(error){
    console.error(error)
    return Promise.reject(error);
  }
}

const fetchAndGet = async function () {
  try{
    const dbArticles = app.model;
    await dbArticles.find({category:{$ne:'CiteSeerx'}},'link').exec(function(error,results){
      if(error) throw error;
      if(results){
        console.log('Results:',results);
        results.map((result)=>{
          console.log('Test:',result);
        })
      }
    })
    return Promise.resolve('Done?');
  }catch(error){
    console.error(error)
    return Promise.reject(error);
  }
}

app.run = async function(){
  try{
    const connection = await init();
    await fetchAndGet();
  }catch(error){
    console.error(error)
  }finally{
    process.exit(0);
  }
}

app.run();
