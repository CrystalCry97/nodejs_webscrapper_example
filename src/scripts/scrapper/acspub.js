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

//also known as topics eg: 'Medicinal Chemistry' or 'biological chemistry'
//join together can form a filter for the queries.
const concepts = [
  '291494', // medical chemistry
  '292178', //organic compounds,
  '290700', //biology
  '292524', //peptides and proteins
]

const site = {
  name: 'acs_publication',
  type: 'ACS Publication',
  baseURL: 'https://pubs.acs.org',
  searchURL:'https://pubs.acs.org/action/doSearch?AllField=',
  counts: 0,
  perPage:20,
  queries:{
    page: '&startPage=',
    limit: '&pageSize=',
    category: '&ConceptID=',
    sort: '&sortBy=Earliest',
  },
  selectors:{
    results : 'span[class="result__count"]', //$(result).text(); 
    page_link: 'h5[class="issue-item_title"] > a',// $(lnk_title).map((i,e)=>{$(e).attr('href')});
    title: 'span[class="hlFld-Title"]', //$(title).text();
    year:'meta[name="dc.Date"]', //$(year).attr('content');
    link:'meta[name="prism.url"]',
    abstract: 'div[id="abstractBox"] > p[class="articleBody_abstractText"]',
    abstract2: 'section[id="Abs1"] > p',
  }

}

site.crawl = async () => {
  const promise = await crawl();
  console.log('Finished Crawling...');
  return promise;
}

// ------------- generate url to crawl ----------------------------------------------------
const genURL = (searchTerms,n_page=1) =>{
  const searchKey = searchTerms.replace(/ /g,'+').replace(/:/g,'%3A').replace(/&/g,'%26');
  const {page,limit,sort} = site.queries;
  return site.searchURL+searchKey+page+n_page+sort+limit+20;
}


// ------------ crawl and crawl eachpage is mostly not changing, depends on the page flow---

const crawl = async () =>{
  for(let i = 0 ; i < keywords.length;){
    const key = keywords[i];
    const url = genURL(key);
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
  for(let i = 0; i < pages;){
    const url = genURL(key,i);
    console.log('URL:',url);
    const html = await getHTML(url);
    if(html !== null){
      const urls = getURLsFromHTML(html);
      for (let i = 1; i <= 2;){
        const url_list = (i == 1) ? urls.slice(0,9) : urls.slice(10,19);
        //console.log("URL_LIST:",url_list);   
        const promises = await url_list.map(async function(url){
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
        await insertDB(articles,site.Model);
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
      const volume = $(selectors.year).attr('content');
      const yrIndex = (volume) ? volume.search(regexYear) : null;
      const year = (volume) ? volume.slice(yrIndex,yrIndex+4) : volume;
      const type = site.type;

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
    }).get();
    return urls;
  }catch(error){}
}


// ----------- get seach result count from the search result page -------------------------
const getResultFromHTML = (html) =>{
  try{
    const $ = cheerio.load(html,{normalizeWhitespace:true,xmlMode:true});
    const results = $(site.selectors.results).first().text();
    if(results !== undefined){
      const total = parseInt(results.replace(/,/g,''));
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
