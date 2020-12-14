require('dotenv').config();
const mongoose = require('mongoose');
const {URI2} = require('./configs/mongo');
const ArticleSchema = require('./models/articles');
const {getHTML} = require('./lib/crawler');
const cheerio       = require('cheerio');
const app = {};

require('events').EventEmitter.defaultMaxListeners = 100;

const selFunc = {
  'American Journal of Critical Care' : `return $(meta['name="citation_doi"]').attr("content")`,
  'Bangladesh Journals': ``,
  'International Journal of Green Pharmacy': `return $('meta[name="DC.Identifier.DOI"]').attr("content")`,
  'Hindawi':``,
  'Journal Drug Delivery & Therapeutics':`return $('meta[name="DC.Identifier.DOI"]').attr("content")`,
  'Jstage Jp':`return $('meta[name="doi"]').attr("content")`,
  'PubMed.gov': `return $('meta[name="citation_doi"]').attr("content")`,
  'Science Direct':`return $('meta[name="dc.identifier"]').attr("content")`,
  'Springer Link':`return $('meta[name="DOI"]').attr("content")`,
  'Taylor and Francis':`return $('meta[name="dc.Identifier"]').attr("content")`,

}
var count = 0; 

const excludeList = ['Bangladesh Journals','Hindawi','CiteSeerx'];

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
    //for await (const doc of dbArticles.find({category: {$nin:['Bangladesh Journals','Hindawi','CiteSeerx']}},'link category')){
      //await getDoi(doc);
    //} //this method caused cursor timeout.
    //const links = await dbArticles.find({category: {$nin:excludeList}},'link category')
    const n = 20;
    const links = await dbArticles.find({doi: {$exists : false}, category: {$nin:excludeList}},'link category')
    if( links.length > 0 ){
      const split_links = new Array(Math.ceil(links.length/n)).fill().map(_=>links.splice(0,n));
      //console.log('Splitted:',split_links);
      for (let i = 0 ; i < split_links.length ;){
        const promises = await split_links[i].map(async function(doc){
          try{
            const newDoc = await getDoi(doc);
            return newDoc; 
          }catch(error){console.error(error)}
        });
        const newDoc = await Promise.all(promises);
        await updateDoi(newDoc);
        i++;
      }
    }
  }catch(error){
    console.log('Fetch Error');
    console.error(error)
    return Promise.reject(error);
  }
}

const getDoi = async function(doc){
  try{
    const {link,category} = doc;
    const html = await getHTML(link);
    if(html !== null){
      const $ = cheerio.load(html,{normalizeWhitespace:true,xmlMode:true});
      const func = new Function('$',selFunc[category]);
      const doi = func($);
			//console.log('Updating DOI:',category);
      //updateDoi(link,doi);
      if(doi === undefined) throw new Error('Undefined DOI'); 
      return {link,doi}
    }
  }catch(error){
    console.error('Get DOI Error:',error);
    return null;
  }
}

const updateDoi = async function(newDoc){
  try{
    const dbArticles = app.model;
    newDoc.map(function(doc){
      if(doc !== null){
        console.log(`Updating:${doc.link}\nDOI:${doc.doi}`);
        const filter = {link:doc.link};
        const update = {doi:doc.doi};
        dbArticles.updateOne(filter,update,function(error,result){
          if(error) console.error(error);
          if(result) {
            count++;
            console.log(`Updated:${count}!\n`);
          }
        });
      }
    });
  }catch(error){
    console.log('Update Error');
    console.error(error);
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
