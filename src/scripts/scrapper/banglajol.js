const puppeteer     = require('puppeteer');
const cheerio       = require('cheerio');
const {promisify}   = require('util');
const querystring   = require('querystring');

const keywords = [
  'Drug-herb',
  'Drug-food',
  'Herb',
  'Herb-interactions',
  'Botanical medicine',
  'herbal medicine',
  'traditional medicine',
  'alternative medicine',
  'complementary medicine',
  'P450 cytochromes',
  'organic anionic transporters',
  'organic anionic',
  'organic cationic transporters',
  'organic cationic',
  'organic cationic transport',
  'P-glycoprotein',
  'Drug transporters',
  'Organic anion transporting polypeptide',
  'ABC:ATP',
  'ABC:ATP binding',
  'ABC:ATP binding cassette transporter super family',
]

// ========================= KIV ==============================================
// this site use post request, so there is no ways for us to manipulate URL.
// need to manual sent post request either using fetch or inside puppeteer.
// this site use PHP, puppeteer seems unecessary, (not sure).
// 
// Ref Link: https://stackoverflow.com/questions/47060534/how-do-post-request-in-puppeteer
//
// TO DO:
//  - change the flow of this script in crawl and crawlEachPages.
//  - change the getHTML methods. new function: puppySearch(keyword); return html
//  - if able to get HTML then other functions are reusable.
// status: not yet start
//
// ============================================================================

const site = {
  name: 'banglajol',
  type: 'Bangladesh Journals',
  baseURL: 'https://www.banglajol.info',
  searchURL:'https://www.banglajol.info/index.php/index/search/search?query=',
  counts: 0,
  perPage:20,
  queries:{
    page: '&searchPage=',
    //limit: '&pageSize=',
    //category: '&ConceptID=',
    //sort: '&orderBy=Earliest&orderDir=',
  },
  selectors:{
    results : 'div[class="cmp_pagination"]', //$(result).text(); 
    page_link: 'div[class="title"] > a',// $(lnk_title).map((i,e)=>{$(e).attr('href')});
    title: 'h1[class="page_title"]', //$(title).text();
    year:'div[class="item published"] > div[class="value"]', //$(year).attr('content');
    link:'meta[name="prism.url"]',
    abstract: 'div[class="item abstract"] > p',
    abstract2: 'section[id="Abs1"] > p',
  }

}

site.crawl = () => {
  crawl();
  return Promise.resolve('Finished');
  //puppySearch('Herb');
}

// ------------- generate url to crawl ----------------------------------------------------
const genURL = (searchTerms,n_page=1) =>{
  const searchKey = searchTerms.replace(/ /g,'%20').replace(/:/g,'%3A').replace(/&/g,'%26');
  const {page} = site.queries;
  return site.searchURL+searchKey+page+n_page;
}


//puppySearch is a new function that will perform in browser post search instead of using url get request.
//it will return a html, just like getHTML function
const puppySearch = async (keyword) => {
  const iPhone = await puppeteer.devices['iPhone 6'];
  const browser = await puppeteer.launch({headless:false});
  //const browser = await puppeteer.launch();
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
// ------------ crawl and crawl eachpage is mostly not changing, depends on the page flow---

const crawl = async () =>{
  for(let i = 0 ; i < keywords.length;){
    const key = keywords[i];
    //console.log('KEY:',key);
    const url = genURL(key);
    console.log('URL:',url);
    const html = await getHTML(url);
    if(html !== null){
      const result = getResultFromHTML(html);
      console.log('RES:',result);
      await crawlEachPages(result,key);

    }
    i++;
  } 
  console.log('Finished with:',site.counts);
}

const crawlEachPages = async ({pages},key) =>{
  for(let i = 1; i < pages + 1;){
    const url = genURL(key,i);
    console.log('URL:',url);
    const html = await getHTML(url);
    if(html !== null){
      const urls = getURLsFromHTML(html);
      const n = 10 ; // change this 10 links per url_list;
      const url_list = new Array(Math.ceil(urls.length/n)).fill().map(_ =>urls.splice(0,n));
      //console.log('URL_LIST:',url_list);
      for (let i = 0; i < url_list.length;){
        //const url_list = (i == 1) ? urls.slice(0,9) : urls.slice(10,19);
        //console.log("URL_LIST:",url_list);   
        const promises = await url_list[i].map(async function(url){
        const html = await getHTML(url);//puppeteer have problem when open more than 10 windows, causing max eventlistener error.
        if(html !== null){
          const article = getArticleFromHTML(html,url);
          return article;
        }else{
          return null;
        }
        });
        const articles = await Promise.all(promises); 
        //console.log('ARTICLE:',articles);
        await insertDB(articles);
        i++;
      }
    }
    console.log('Inserted:',site.counts);
    i++;
  }
}


// ------------ part of code that mostly changing ----------

const getArticleFromHTML = (html,url)=>{
  try{
    const {selectors} = site;
    const $ = cheerio.load(html,{normalizeWhitespace:true,xmlMode:true});
    //const link = $(selectors.link).attr('content');
    const link = url;
    const title = $(selectors.title).text();
    if( typeof title === 'string' || title instanceof String){
      var abstracts = $(selectors.abstract).text() ;
      if(abstracts === "") abstracts = $(selectors.abstract2).text();
      const regexYear = /\d{4}/; //find \d : digits, {4} :  4 times like 2009. anchor ^ mean explicitly contains strings that begin and end with 4 digits.
      const year = $(selectors.year).text();
      const type = site.type;

      //console.log('TITLE:',title);
      //console.log('YEAR:',volume);
      //console.log('LINK:',link);
      //console.log('\nDESCRIPTION: ',abstracts);
      return {
        title,
        link,
        abstract: abstracts,
        year,
        type,
      }
    }else{
      throw new Error('Invalid Articles due to missing title');
    }
  }catch(error){
    console.error(error);
    return null;
    //return null;
  }
  
}

// ----------- get list of articles urls from the search result page -------------------------

const getURLsFromHTML = (html) => {
  try{
    const {page_link} = site.selectors;
    const $ = cheerio.load(html,{normalizeWhitespace:true, xmlMode:true});
    const urls = $(page_link).map(function(i,el){
      const url = $(el).attr('href');
      //return site.baseURL + url;
      return url;
    }).get();
    //console.log('URL_LIST:',urls);
    return urls;
  }catch(error){}
}


// ----------- get seach result count from the search result page -------------------------
const getResultFromHTML = (html) =>{
  try{
    const $ = cheerio.load(html,{normalizeWhitespace:true,xmlMode:true});
    const results = $(site.selectors.results).first().text();
    if(results !== undefined){
      console.log('RESULT IN:',results);
      const tolRegx = /(?<=of) \d/g;
      var total = results.slice(results.search(tolRegx),results.search(/(items)/g));
      console.log('TOTAL:',total);
      total = parseInt(total.replace(/,/g,''));
      if(total === 0) throw new Error('No results found');
      let pages = (Math.ceil(total/site.perPage));
      return {
        total,
        pages,
      }
    }
    else{
      throw new Error({message:'No Search Result'});
    }
  }catch(error){
    console.error(error.message);
    return null;
  }
}



// ------------ mostly unchanged code -----------------


const getHTML = async (URL) => {
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


const insertDB = async (articles) => {
   const Article = site.Model;
   articles.map(function(article){
     if(article !== null){
       Article.create(article,function(error,result){
         if(error) insertErrorHandler(error,article);
         if(result) site.counts += 1;
       });
     }
   });
}
 
const sleep = promisify(setTimeout);

const insertErrorHandler = (error,article) => {
  if(error.name == 'MongoError' && error.code === 11000){
    console.error('Duplicate Key Error:',article.link);
  }
  if(error.name == 'ValidationError'){
    console.error('ValidationError:',article.link);
  }
}

module.exports = site;
