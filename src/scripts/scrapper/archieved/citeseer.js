
const puppeteer     = require('puppeteer');
const cheerio       = require('cheerio');
const {promisify}   = require('util');
const {getHTML,insertDB,insertErrorHandler,sleep}       = require('../../lib/crawler');

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

const site = {
  name: 'citeseerx',
  type: 'CiteSeerx',
  baseURL: 'https://citeseerx.ist.psu.edu',
  searchURL:'https://citeseerx.ist.psu.edu/search?q=',
  counts: 0,
  perPage:20,
  queries:{
    page: '&start=',
    //limit: '&pageSize=',
    //category: '&ConceptID=',
    //sort: '&orderBy=Earliest&orderDir=',
  },
  selectors:{
    results : 'div[id="result_info"]', //$(result).text(); 
    page_link: 'div[class="result"] > h3 > a',
    //title: 'meta[name="citation_title"]', //$(title).attr('content');
    title:'div[id="viewHeader"] >h2',
    year:'meta[name="DC.Date.dateSubmitted"]', //$(year).attr('content');
    link:'meta[name="DC.url"]',
    abstract: 'meta[name="description"]',
    abstract2: 'div[id="abstract"] > p',

  }

}

site.crawl = async () => {
  try{
    return await crawl();
  }catch(error){
    console.error('Error Crawling:',site.name);
  }
    //puppySearch('Herb');
}

// ------------- generate url to crawl ----------------------------------------------------
const genURL = (searchTerms,n_page=1) =>{
  //const searchKey = searchTerms.replace(/ /g,'%20').replace(/:/g,'%3A').replace(/&/g,'%26');
  const searchKey = searchTerms.replace(/ /g,'+').replace(/:/g,'%3A').replace(/&/g,'%26'); 
  const {page} = site.queries;
  return site.searchURL+searchKey+page+n_page;
}

const crawl = async () =>{
  for(let i = 0 ; i < keywords.length;){
    const key = keywords[i];
    console.log('KEY:',key);
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
  return Promise.resolve('Done');
}

const crawlEachPages = async ({pages},key) =>{
  for(let i = 0; i < pages + 1;){
    sleep(10000);
    const url = genURL(key,i);
    console.log('URL:',url);
    const html = await getHTML(url);
    if(html !== null){
      const urls = getURLsFromHTML(html);
      //console.log('URLs Array:',urls);
      const n = 10 ; // change this 10 links per url_list;
      const url_list = new Array(Math.ceil(urls.length/n)).fill().map(_ =>urls.splice(0,n));
      console.log('URL_LIST:',url_list);
      for (let i = 0; i < url_list.length;){
        //const url_list = (i == 1) ? urls.slice(0,9) : urls.slice(10,19);
        //console.log("URL_LIST:",url_list);   
        const promises = await url_list[i].map(async function(url){
        const html = await getHTML(url);//puppeteer have problem when open more than 10 windows, causing max eventlistener error.
        if(html !== null){
          const article = getArticleFromHTML(html,url);
          console.log('ART:',article);
          return article;
        }else{
          return null;
        }
        });
        const articles = await Promise.all(promises); 
        //console.log('ARTICLE:',articles);
        await insertDB(articles,site);
        i++;
      }
    }
    console.log('Inserted:',site.counts);
    //i++;
    i+=10;
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
      var abstracts = $(selectors.abstract).attr('content') ;
      if(abstracts === "") abstracts = $(selectors.abstract2).text();
      const regexYear = /\d{4}/; //find \d : digits, {4} :  4 times like 2009. anchor ^ mean explicitly contains strings that begin and end with 4 digits.
      const year = $(selectors.year).attr('content');
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
      return site.baseURL + url;
      //return url;
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
      var total = results.slice(results.search(tolRegx),-1);
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

module.exports = site;
