# nodejs_webscrapper_example

- main script is `testmap.js`.
- `scripts/scrapper` contains scrapper script for each website we want to scrap.
- `scripts/index` is simply a loader that load the scrapper scripts as functions we will call in testmap.js
- `regexs/` folder is simply a contains `javascript regex that we used to check for validation`
- `models/` is our result model we want to store in mongodb.
- `libs/` is just a libaries folder contains, functions/class that we use in our scrapper script.

## How it work.
- this script, use `puppeteer` to get webpages source code.
- then it use `cheerio` to make use of jQuery, to scrap the webpage.
- it use the `regex` to clean up the result or filter for specific result.
- then store it in mongodb.
- each crawled domain/site will create their own collection. 
- after the script finish scrapp all link, it will merge the collections into single collection. 


## Scrapper script example.
```js
const puppeteer     = require('puppeteer');
const cheerio       = require('cheerio');
const {promisify}   = require('util');
const {getHTML,insertDB,insertErrorHandler,sleep}       = require('../../lib/crawler');
const keywords = require('../../lib/keywords').load();

//----------------------------------- MAIN CONFIG PART---------------------------
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
  functions:{
    getDoi : 'return $(selectors.doi).attr("content")',
  },
  selectors:{
    results : 'span[class="result__count"]', //$(result).text(); 
    doi : 'meta[scheme="doi"]',
    page_link: 'h5[class="issue-item_title"] > a',// $(lnk_title).map((i,e)=>{$(e).attr('href')});
    title: 'span[class="hlFld-Title"]', //$(title).text();
    year:'meta[name="dc.Date"]', //$(year).attr('content');
    link:'meta[name="prism.url"]',
    abstract: 'div[id="abstractBox"] > p[class="articleBody_abstractText"]',
    abstract2: 'section[id="Abs1"] > p',
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
    console.error(error);
    console.log('Error crawling:',site.name);
  }
}
// -----------------------------------------------------------------------------

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
    console.log(`${site.name} inserted: ${site.counts}`);
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
      if(abstracts === "") abstracts = $(selectors.abstract2).text();
      const regexYear = /\d{4}/; //find \d : digits, {4} :  4 times like 2009. anchor ^ mean explicitly contains strings that begin and end with 4 digits.
      const volume = $(selectors.year).attr('content');
      const yrIndex = (volume) ? volume.search(regexYear) : null;
      const year = (volume) ? volume.slice(yrIndex,yrIndex+4) : volume;
      const category = site.type;
      const doi = $(selectors.doi).attr('content');

      return {
        title,
        link,
        abstract: abstracts,
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
    return urls;
  }catch(error){}
}


// ------------- get result number -----------------------------------
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

//-----------------------------------------------------------------------------

module.exports = site;
```

### Scrapper script explain.
- all script mostly have the same template, with only changing the `site` variable.
- the `const site` variable holds the information that are unique about the site we are going to crawl and scrap.
- it is like our site config file.
```js
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
  functions:{
    getDoi : 'return $(selectors.doi).attr("content")',
  },
  selectors:{
    results : 'span[class="result__count"]', //$(result).text(); 
    doi : 'meta[scheme="doi"]',
    page_link: 'h5[class="issue-item_title"] > a',// $(lnk_title).map((i,e)=>{$(e).attr('href')});
    title: 'span[class="hlFld-Title"]', //$(title).text();
    year:'meta[name="dc.Date"]', //$(year).attr('content');
    link:'meta[name="prism.url"]',
    abstract: 'div[id="abstractBox"] > p[class="articleBody_abstractText"]',
    abstract2: 'section[id="Abs1"] > p',
  }

}
```
- we perform crawling, by appending the `keywords` from the `keywords.txt` file and `site.queries` variable to our `site.searchURL`
- we loops through all the keywords in the `crawl()` function.
- we using the `genURL` function to generate new URL.
```js
//------------------- Generating URL to crawl ----------------------------------
    const genURL = (searchTerms,n_page=1) =>{
    //const searchKey = searchTerms.replace(/ /g,'%20').replace(/:/g,'%3A').replace(/&/g,'%26');
    const searchKey = searchTerms.replace(/ /g,'+').replace(/:/g,'%3A').replace(/&/g,'%26'); 
    const {page} = site.queries;
    return site.searchURL+searchKey+page+n_page;
    }
```
- this URL will then be passed to puppeteer to search for the first page..
- we get the result count, and page count from the HTML using the `getResultFromHTML` page, to loop over it in `crawlEachPage` function.
- then we will get all the urls of articles using `getURLsFromHTML` and store it in list.
- then we go through each of that article URL, fetch the HTML, and scrap it using `getArticleFromHTML` function.
- this function, make use of `site.selectors` variable we declared in `site` variable, to scrap for the article information.
- it then return an articles and stored it into the DB.
