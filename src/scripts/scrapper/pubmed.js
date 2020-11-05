const puppeteer = require('puppeteer');
const axios = require('axios');
const {promisify} = require('util');
const cheerio = require('cheerio');

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

const pubmed = {
  name: 'pubmed',
  baseURL : 'https://pubmed.ncbi.nlm.nih.gov/',
  searchURl: 'https://pubmed.ncbi.nlm.nih.gov/?term=',
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
    articles : 'div.results-article',
    year: 'time.citation-year',
    title: 'h1.heading-title > a',
    abstracts : 'div.abstract-content',
    link: 'div.full-text-links-list > a.link-item',
    results: 'div.results-amount > span.value',
  }
}

pubmed.crawl = async () => {
  //const URL_LIST = 
  await crawl();
  //const article = await scrap(URL_LIST);
}

const crawl = async() =>{
 
  const {publication} = pubmed.queries; 
  const pub = publication.join('');
  for(let i = 0; i < keywords.length ; ){
    const key = keywords[i].replace(/ /g,'%20').replace(/:/g,'%3A');
    const url = genURL(key,1,pub);
    console.log('URL:',url);
    const html = await getHTML(url); 
    if(html && (html !== null)){
      const searchRes = getResultFromHTML(html);
      console.log('RES:',searchRes);
      await crawlEachPages(searchRes,key,pub);
    }
  i++;
  }
}

const crawlEachPages = async ({pages},key,pub) =>{
  for(let i = 1; i < pages ; ) {
    const url = genURL(key,i,pub);
    console.log('\nNEW_URL:',url);
    const html = await getHTML(url);
    if(html && (html !== null)){
      const articles = getArticlesFromHtml(html);
      //console.log('ARticles:',articles);
      await insertDB(articles);
    }
    i++;
  }
}

const insertDB = async (articles) => {
  const Article = pubmed.Model;
  articles.map(function(article){
    Article.create(article,function(err,results){
      if(err) {
        //console.error(err) 
        //console.log('\n\nProblematic:=>',article);
        insertErrorHandler(err,article);
      }
      //else{
        ////if(results) {
          ////console.log('Created:',results.title)
       ////}
      //}
    })  
  })
}
const getArticlesFromHtml = (html) => {
  try{
    const {selectors} = pubmed;
    const $ = cheerio.load(html,{normalizeWhitespace:true,xmlMode:true});
    //console.log('SELECTORS:',selectors.articles);
    const articles = $(selectors.articles).map(function(index,el){
      const title = $(el).find(selectors.title).first().text();
      const link = pubmed.baseURL + $(el).find(selectors.title).first().attr('href');
      const abstract = $(el).find(selectors.abstracts).text();
      var year = $(el).find(selectors.year).text();
      //year = (year && year !== undefined) ? year.slice(0,4) : null; 
      return {
        title,
        link,
        abstract,
        year
      };
    }).get(); 
    return articles;
  }catch(err){
    console.error(err);
  }
}

const getHTML = async (URL) => {
  
  //const browser = await puppeteer.launch({headless:false});
  const browser = await puppeteer.launch(); // use headless:false to show chrome.
  try{
    const page = await browser.newPage();
    await page.goto(URL);
    const html = await page.content();
    //await browser.close();
    return html;
  }catch(err){
    console.error(err);
    return null;
    //await browser.close();
  }finally{
    await browser.close();
  }
    
  
}

const getResultFromHTML = (rawhtml) => {
  try{
    const $ = cheerio.load(rawhtml,{normalizeWhitespace:true,xmlMode:true});
    const results = $(pubmed.selectors.results).first().text();
    if(results && (results !== undefined)){
      //console.log('\nRESult=>',results);
      const total = parseInt(results.replace(/,/g,''));
      let pages = (Math.ceil(total/10)+1);
      pages = ( pages <= 1000) ? pages : 1000 ; 
      return {
        total,
        pages
      }
    }
    else{
      console.log('Bad Result:');
    }
  }catch(err){
    console.error(err);
  }
}

const genURL = (searchTerms,n_page=1,publication) =>{
  const {years,page,format,sort} = pubmed.queries;
  return pubmed.searchURl+searchTerms+publication+years+format+sort+page+n_page;
}

const sleep = promisify(setTimeout);

const insertErrorHandler = (err,article) => {
  if(err.name == 'MongoError' && err.code === 11000){
    console.error('Dulicate Key Error:',article.link);
  }
  if(err.name == 'ValidationError'){
    console.error('\n\n Validation Error:',article.link);
    //assert.equal(err.errors['abstract'].message, 'Articles got no abstract');
    //assert.equal(err.errors['title'].message,' No title');
  }
  //else{
    //console.error(err);
  //}
}

module.exports = pubmed;

