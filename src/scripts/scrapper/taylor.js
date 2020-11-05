const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const {promisify} = require('util');


const keywords = [
  'Drug AND herb',
  'Drug AND food',
  'Herb',
  'Herb AND interactions',
  'Botanical AND medicine',
  'herbal AND medicine',
  'traditional AND medicine',
  'alternative AND medicine',
  'complementary AND medicine',
  'P450 cytochromes',
  'organic AND anionic transporters',
  'organic AND anionic',
  'organic AND cationic transporters',
  'organic AND cationic',
  'organic AND cationic AND transport',
  'P-glycoprotein',
  'Drug AND transporters',
  'Organic anion transporting polypeptide',
  'ABC:ATP',
  'ABC:ATP binding',
  'ABC:ATP binding cassette transporter super family',


]


const taylor = {
  name: 'taylor',
  type: 'Taylor and Francis',
  baseURL: 'https://www.tandfonline.com',
  searchURL:'https://www.tandfonline.com/action/doSearch?field1=AllField&text1=',
  counts:0,
  queries: {
    limit: '&pageSize=10',
    page: '&startPage=',
    sort : '&sortBy=Earliest_desc',

  },
  selectors: {
    results : 'li.search-results > p[role=status] > strong', //$(results).last().text();
    page_link: 'a[class="ref nowrap"]',//$(link).map(e => { $(e).attr('href') }).
    title : 'span[class="NLM_article-title hlFld-title"]',
    year: 'h2:has(> a[class="nav-toc-list"])',
    //link: 'li[class="dx-doi"] > a', //$(link).attr('href')
    link: 'meta[property="og:url"]',// $(link).attr('content');
    abstract: 'div[class="abstractSection abstractInFull"]',//$(abstract).text();

  },
}

taylor.crawl = () => {
  crawl();
}

const crawl = async () => {
  for (let i = 0 ; i < keywords.length;){
    const key = keywords[i];
    const url = genURL(key);
    const html = await getHTML(url);
    if(html !== null){
      const searchRes = getResultFromHTML(html);
      console.log('RES:',searchRes);
      await crawlEachPages(searchRes,key);
    }
    i++;
  }
  console.log('Finished with:',taylor.counts);
}

const crawlEachPages = async ({pages},key ) =>{
  for(let i=0; i< pages;){
    const url = genURL(key,i);
    console.log('URL:',url);
    const html = await getHTML(url);
    if(html!==null){
      const urls = getURLsFromHTML(html);
      console.log('URL_LIST:',urls);
      const promises = await urls.map(async function(url){
        const html = await getHTML(url);
        if(html!==null){
          const article = getArticleFromHTML(html); 
          return article;
        }else{
          return null
        }
      }); 
      const articles = await Promise.all(promises);
      await insertDB(articles);
      //console.log('ART:',articles);
    }
    console.log('Inserted:',taylor.counts);
    i++;
  }
}

const insertDB = async (articles) => {
  const Article = taylor.Model;
  articles.map(function(article){
    if(article !== null){
      Article.create(article,function(error,result){
        if(error) insertErrorHandler(error,article);
        if(result) taylor.counts += 1;
      });
    }
  });
}

const getArticleFromHTML = (html)=>{
  try{
    const {selectors} = taylor;
    const $ = cheerio.load(html,{normalizeWhitespace:true,xmlMode:true});
    const link = $(selectors.link).attr('content');
    const title = $(selectors.title).text();
    const abstracts = $(selectors.abstract).text();
    const regexYear = /\d{4}/; //find \d : digits, {4} :  4 times like 2009. anchor ^ mean explicitly contains strings that begin and end with 4 digits.
    const volume = $(selectors.year).text();
    const yrIndex = volume.search(regexYear);
    const year = volume.slice(yrIndex,yrIndex+4);
    const type = taylor.type;

    //console.log('TITLE:',title);
    return {
      title,
      link,
      abstract: abstracts,
      year,
      type,
    } 
  }catch(error){
    console.error(error);
  }
  
}
const getURLsFromHTML = (html) => {
  try{
    const {page_link} = taylor.selectors;
    const $ = cheerio.load(html,{normalizeWhitespace:true, xmlMode:true});
    const urls = $(page_link).map(function(i,el){
      const url = $(el).attr('href');
      return taylor.baseURL + url;
    }).get();
    //console.log('URL_LIST:',urls);
    return urls;
  }catch(error){}
}
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

const getResultFromHTML= (html)=>{
  try{
    const {results} = taylor.selectors;
    const $ = cheerio.load(html,{normalizeWhitespace:true,xmlMode:true}); 
    const result = $(results).last().text();
    const total = parseInt(result.replace(/,/g,''));
    if(total !== 0){  
      let pages = (Math.ceil(total/10));
      pages = (pages > 200) ? 199 : pages ;
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

const insertErrorHandler = (error,article) =>{
  if(error.name == 'MongoError' && error.code === 11000){
    console.error('Duplicate Key Error:',article.link);
  }if(error.name == 'ValidationError'){
    console.error('\n\nValidation Error:',article.link);
  }
}
const genURL = (key,n=1) => {
  const searchkey = key.replace(/ /g,'+').replace(/:/g,'%3A');
  const {page,limit,sort} = taylor.queries;
  return taylor.searchURL+searchkey+ limit+page+n;
}

module.exports = taylor;
