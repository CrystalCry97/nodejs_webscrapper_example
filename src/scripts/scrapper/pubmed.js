
const puppeteer     = require('puppeteer');
const cheerio       = require('cheerio');
const {promisify}   = require('util');
const {getHTML,insertDB,insertErrorHandler,sleep}       = require('../../lib/crawler');

const keywords = [
  'Drug-herb interactions',
  'Drug-food interactions',
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
  name: 'pubmed',
  type: 'PubMed.gov', 
  baseURL : 'https://pubmed.ncbi.nlm.nih.gov',
  searchURl: 'https://pubmed.ncbi.nlm.nih.gov/?term=',
  counts: 0,
  perPage: 10,
  queries: {
    sort: '&sort=date',
    page: '&page=',
    years : '&filter=years.2001-2020', //note: when use years, don't use past10.
    past10 : '&filter=datesearch.y10',
    format: '&format=abstract',
    publication: [
      '&filter=pubt.booksdocs',
      '&filter=pubt.clinicaltrial',
      '&filter=pubt.meta-analysis',
      '&filter=pubt.randomizedcontrolledtrial',
      '&filter=pubt.review',
      '&filter=pubt.systematicreview'
    ],
  },
  selectors: {
    page_link: 'div.docsum-content > a.docsum-title',
    results : 'div[class="results-amount"]> span[class="value"]',
    articles : 'div.results-article',
    year: 'time.citation-year',
    title: 'h1.heading-title > a',
    abstracts : 'div.abstract-content',
    link: 'div.full-text-links-list > a.link-item',
    results: 'div.results-amount > span.value',
  }
}

// ----------------------------- generate search URL -----------------------------------------
const genURL = (searchTerms,n_page=1) =>{
  const {publication} = site.queries;
  const pub = publication.join('');
  const searchKey = searchTerms.replace(/ /g,'%20').replace(/:/g,'%3A');
  const {page,sort,years,format} = site.queries;
  return site.searchURl+searchKey+pub+years+format+sort+page+n_page;
}

//---------------------------------------------------------------------------------------------

//-------------------------------Naub Crawling function start ---------------------------------
site.crawl = async () =>{
  try{
    return await crawl();
  }catch(error){
    console.error(error);
  }
}
//---------------------------------------------------------------------------------------------

const crawl = async () => {
  for(let i = 0; i < keywords.length;){
    const key = keywords[i];
    const url = genURL(key);
    const html = await getHTML(url);
    if(html !== null){
      const result = getResultFromHTML(html);
      await crawlEachPages(result,key);
    }
    i++;
  }
  console.log(`Finished ${site.name}: ${site.counts}`);
  return Promise.resolve('Done');
}

//------------------------- crawl Each page --------------------------------------------------
const crawlEachPages = async ({pages},key) =>{
  for(let i = 0; i < pages;){
    const url = genURL(key,i);
    const html = await getHTML(url);
    if(html !== null){
      const urls = getURLsFromHTML(html);
      const n = 10; // urls per array.
      const url_list = new Array(Math.ceil(urls.length/n)).fill().map(_=>urls.splice(0,n)); //devide urls into list of urls
      // should I use for or map ?
      for(let x = 0; x < url_list.length;){
        const promises = await url_list[x].map(async function(url){
          const html = await getHTML(url);
          if(html !== null){
            return getArticleFromHTML(html,url);
          }else{
            return null;
          }
        });
        const articles = await Promise.all(promises);
        await insertDB(articles,site);
        x++;
      }
    }
    i++;
  }
}
//--------------------------------------------------------------------------------------------
//--------------------- GET article attributes from HTML --------------------------------------
const getArticleFromHTML = (html,link) => {
  try{
    const {selectors} = site;
    const $ = cheerio.load(html,{normalizeWhitespace:true,xmlMode:true});
    
    //------ get title
    let title = $(selectors.title).first().text();
    title = title.trim().substr(0,255);
    
    //------ get description.
    if(typeof title == 'string' || title instanceof String){
      let abstracts = $(selectors.abstracts).first().text();
      let year = $(selectors.year).text();

      return {
        title,
        link,
        abstracts,
        year,
        category : site.type,
      }
    }else{
      throw new Error('Missing title for an article');
    }

  }catch(error){
    console.error(error);
    return null;
  }
}
//--------------------------------------------------------------------------------------------
// -------------------------- get URL from HTML ----------------------------------------------
const getURLsFromHTML = (html) =>{
  try{
    const {page_link} = site.selectors;
    const $ = cheerio.load(html,{normalizeWhitespace:true, xmlMode:true});
    const urls = $(page_link).map(function(i,el){
      const url = $(el).attr('href');
      return site.baseURL+url;
    }).get();
    return urls;
  }catch(error){
    console.error(error);
    return null;
  }
}


const getResultFromHTML = (html) =>{
  try{
    const $ = cheerio.load(html,{normalizeWhitespace:true,xmlMode:true});
    const results = $(site.selectors.results).first().text();
    if(results !== undefined){
      const total = parseInt(results.replace(/,/g,''));
      const pages = (Math.ceil(total/site.perPage));
      return {
        total,
        pages,
      }
    }else{
      throw new Error('No Search Result...');
    }
  }catch(error){
    console.error(error);
    return null;
  }
}
// -------------------------------------------------------------------------------------------
