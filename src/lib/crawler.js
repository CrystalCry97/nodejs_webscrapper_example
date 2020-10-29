const puppeteer = require('puppeteer');
const {promisify} = require('util');
const cheerio = require('cheerio');
const queryString = require('querystring');

const lib = {}
// ========================== NOT SO REUSABLE CODE ===============================

lib.puppySearch = async (keyword) => {
  const iPhone = await puppeteer.devices['iPhone 6'];
  //const browser = await puppeteer.launch({headless:false});
  const browser = await puppeteer.launch();
  try{
    const page = await browser.newPage();
    const formData = {
      'csrfToken': 'ed40c777d0985e9bda264d0fd990f9d9',
      'query' : keyword,
    };
    await page.setRequestInterception(true);
    page.once('request',request=>{
      var data = {
        'method':'POST',
        'postData':querystring.stringify(formData),
        'headers':{
          ...request.headers(),
          'Content-Type':'application/x-www-form-urlencoded',
          'Origin':'https://www.banglajol.info',
          'Referer':'https://www.banglajol.info/index.php/index/search/search'
        }
      };
      request.continue(data);
      page.setRequestInterception(false);
    });
    await page.goto(site.searchURL);
    const response = await page.content();
    //console.log('RESP:',response);
    return response;

  }catch(error){
    console.error('Error In PuppySearch:',error);
  }finally{
    await browser.close();
  }
}


lib.getResultFromHTML = (html,selector) => {
  try{
    const $ = cheerio.load(html,{normalizeWhitespace:true,xmlMode:true});
    //const getResult = new Function('selector','selecStr') 
    if(result !== undefined){
      
    }
  }catch(error){
    return null;
  }
}

// ====================== reusable code section ================================

lib.getHTML = async (URL) => {
  const iPhone = puppeteer.devices['iPhone 6'];
  //const browser = await puppeteer.launch({headless:false});
  const browser = await puppeteer.launch();
  try{
    const page = await browser.newPage();
    await page.emulate(iPhone);
    await page.goto(URL,{waitUntil:"domcontentloaded"});
    const html = await page.content();
    return html;

  }catch(error){
    if(error.name == 'TimeoutError'){
      console.log('Web Page Takes to long to response');
      return null;
    }
    console.error(error);
  }finally{
    await browser.close();
  }
}


lib.insertDB = async (articles,Model) => {
   const Article = Model;
   articles.map(function(article){
     if(article !== null){
       Article.create(article,function(error,result){
         if(error) insertErrorHandler(error,article);
         if(result) site.counts += 1;
       });
     }
   });
}
 
lib.sleep = promisify(setTimeout);

lib.insertErrorHandler = (error,article) => {
  if(error.name == 'MongoError' && error.code === 11000){
    console.error('Duplicate Key Error:',article.link);
  }
  if(error.name == 'ValidationError'){
    console.error('ValidationError:',article.link);
  }
}


module.exports = lib;
