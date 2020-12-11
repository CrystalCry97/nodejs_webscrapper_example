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
    const links = await dbArticles.find({category: {$nin:['Bangladesh Journals','Hindawi','CiteSeerx']}},'link category')
    const split_links = new Array(Math.ceil(links.length/10)).fill().map(_=>links.splice(0,10));
    //console.log('Splitted:',split_links);
    for await (let urls of split_links){
      await urls.map(async (doc)=>{
        console.log('Doc:',doc);
      });
    }
  }catch(error){
    console.error(error)
    return Promise.reject(error);
  }
}

const getDoi = async function(doc){
  const {link,category} = doc;
  try{
    const html = await getHTML(link);
    if(html !== null){
      const $ = cheerio.load(html,{normalizeWhitespace:true,xmlMode:true});
      const func = new Function('$',selFunc[category]);
      const doi = func($);
      updateDoi(link,doi);
    }
  }catch(error){
    console.error('update Error:',error);
  }
}

const updateDoi = async function(link,doi){
  const dbArticles = app.model;
  const filter = {link:link};
  const update = {doi:doi};

  //console.log(`link:${link}\nDoi:${doi}\n`);
  let doc = await dbArticles.findOneAndUpdate(filter,update,{
    new: true
  });
  console.log(`updated:${doc.title}\ndoi:${doc.doi}\n\n`);
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
