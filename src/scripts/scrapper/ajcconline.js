const puppeteer     = require('puppeteer');
const cheerio       = require('cheerio');
const {promisify}   = require('util');
const {getHTML,insertDB,insertErrorHandler,sleep,stripHtmlTags}       = require('../../lib/crawler');
const keywords = require('../../lib/keywords').load();

//const keywords = [
  //'Drug-herb',
  //'Drug-food',
  //'Herb',
  //'Herb-interactions',
  //'Botanical medicine',
  //'herbal medicine',
  //'traditional medicine',
  //'alternative medicine',
  //'complementary medicine',
  //'P450 cytochromes',
  //'organic anionic transporters',
  //'organic anionic',
  //'organic cationic transporters',
  //'organic cationic',
  //'organic cationic transport',
  //'P-glycoprotein',
  //'Drug transporters',
  //'Organic anion transporting polypeptide',
  //'ABC:ATP',
  //'ABC:ATP binding',
  //'ABC:ATP binding cassette transporter super family',
//]


//------------------------- MAIN CHANGING CONFIG PART---------------------------
const site = {
  name: 'ajcc',
  type: 'American Journal of Critical Care',
  baseURL: 'https://aacnjournals.org',
  searchURL:'https://aacnjournals.org/ajcconline/search-results?q=',
  counts: 0,
  perPage:20,
  queries:{
    page: '&page=',
    limit: '&pageSize=',
    sort: '&sort=Date+-+Newest+First',
  },
  selectors:{
    results : 'div[class="sr-statistics"]', //$(result).text(); //need to do regex 
    doi : 'meta[name="citation_doi"]',
    page_link: 'div[class="sri-title customLink al-title"] > h4 > a ',// $(lnk_title).map((i,e)=>{$(e).attr('href')});
    title: 'h1[class="wi-article-title article-title-main"]', //$(title).text();
    year:'meta[name="citation_publication_date"]', //$(year).attr('content');
    link:'meta[name="prism.url"]',
    abstract: 'div[data-widgetname="ArticleFulltext"]', //$(abstract).html(); then strip_html_tag
    //abstract2: 'section[id="Abs1"] > p',
  }

}
//------------------------------------------------------------------------------

//------------------- Generating URL to crawl ----------------------------------
const genURL = (searchTerms,n_page=1) =>{
  const searchKey = searchTerms.replace(/ /g,'+').replace(/:/g,'%3A').replace(/&/g,'%26');
  const {page,limit,sort} = site.queries;
  return site.searchURL+searchKey+page+n_page+sort+limit+20;
}
//------------------------------------------------------------------------------

// ------------------ Where Main Crawling function start ------------------------
site.crawl = async () => {
  try{
    const promise = await crawl();
    console.log('Finished Crawling...');
    return promise;
  }catch(error){
    console.log('Error crawling:',site.name);
  }
}
// -----------------------------------------------------------------------------

const crawl = async () =>{
  for(let i = 0 ; i < keywords.length;){
    const key = keywords[i];
    const url = genURL(key);
    console.log('GEN_URL:',url);
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


// ----------------------- crawl each page to get raw html of the page---------
const crawlEachPages = async ({pages},key) =>{
  for(let i = 0; i < pages;){
    const url = genURL(key,i);
    console.log('URL:',url);
    const html = await getHTML(url);
    if(html !== null){
      const urls = getURLsFromHTML(html);
      const n = 10 ; // urls per array;
      const url_list = new Array(Math.ceil(urls.length/n)).fill().map(_=>urls.splice(0,n)); // devide url list into arrays of size n;
      // for or map ??
      for( let x = 0; x < url_list.length;){
        const promises = await url_list[x].map(async function(url){
          const html = await getHTML(url);
          if(html !== null){
            const article = getArticleFromHTML(html,url);
            return article;
          }else{
            return null;
          }
        });
        const articles = await Promise.all(promises);
        await insertDB(articles, site);
        x++;
      } 
    }
    console.log(`${site.name}, inserted: ${site.counts}`);
    i++;
  }
}
// ----------------------------------------------------------------------------

// ------------- changing code ------------------------------------------------
const getArticleFromHTML = (html,url)=>{
  try{
    const {selectors} = site;
    const $ = cheerio.load(html,{normalizeWhitespace:true,xmlMode:true});
    //const link = $(selectors.link).attr('content');
    const link = url;
    const title = $(selectors.title).text();
    if( typeof title === 'string' || title instanceof String){
      var abstracts = $(selectors.abstract).text() ;
      //console.log('\nABSTRACT:',abstracts);
      abstracts = stripHtmlTags(abstracts);
      //if(abstracts === "") abstracts = $(selectors.abstract2).text();
      const regexYear = /\d{4}/; //find \d : digits, {4} :  4 times like 2009. anchor ^ mean explicitly contains strings that begin and end with 4 digits.
      const volume = $(selectors.year).attr('content');
      const yrIndex = (volume) ? volume.search(regexYear) : null;
      const year = (volume) ? volume.slice(yrIndex,yrIndex+4) : volume;
      const category = site.type;
      const doi = $(selectors.doi).attr('content');

      return {
        title,
        link,
        abstract: (abstracts)? abstracts : null ,
        year,
        category,
        doi,
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
// --------------- get URLs from html --------------------------------
const getURLsFromHTML = (html) => {
  try{
    const {page_link} = site.selectors;
    const $ = cheerio.load(html,{normalizeWhitespace:true, xmlMode:true});
    const urls = $(page_link).map(function(i,el){
      const url = $(el).attr('href');
      return site.baseURL + url;
    }).get();
    //console.log('URL_LIST:',urls);
    return urls;
  }catch(error){}
}

// ------------- get result number -----------------------------------
const getResultFromHTML = (html) =>{
  try{
    const $ = cheerio.load(html,{normalizeWhitespace:true,xmlMode:true});
    const results = $(site.selectors.results).first().text();
    if(results !== undefined){
      //console.error(' //need to add regex here for total'); 
      console.log('RESULT:',results);
      const totalRegex = /(?<=of) \d/g;
      var total = results.slice(results.search(totalRegex),results.search(/(Search)/g)); 
      console.log('TOTAL:',total);
      total = parseInt(total.replace(/,/g,''));
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

//-----------------------------------------------------------------------------

module.exports = site;
