const puppeteer = require('puppeteer');
const {promisify} = require('util');
const cheerio = require('cheerio');
const keywords = require('../../lib/keywords').load();

//const keywords = [
  //'Drug-herb interactions',
  //'Drug-food interactions',
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

const filters = [
  'Drug-herb',
  'herb',
  'medicine',
  'medical',
  'Botanical',
  'herbal',
  'traditional',
  'alternative',
  'p450',
  'cytochromes',
  'organic',
  'anionic',
  'cationic',
  'p-glycoprotein',
  'transporter',
  'ABC',
  'ABC:ATP',

]

const journal=[
"&journal=AIDS Research and Treatment",
"&journal=Advances in Hematology",
"&journal=Advances in Medicine",
"&journal=Advances in Orthopedics",
"&journal=Advances in Pharmacological and Pharmaceutical Sciences",
"&journal=Advances in Public Health",
"&journal=Advances in Urology",
"&journal=Advances in Virology",
"&journal=Analytical Cellular Pathology",
"&journal=Anemia",
"&journal=Anesthesiology Research and Practice",
"&journal=Autism Research and Treatment",
"&journal=Autoimmune Diseases",
"&journal=BioMed Research International",
"&journal=Biochemistry Research International",
"&journal=Canadian Journal of Gastroenterology and Hepatology",
"&journal=Canadian Journal of Infectious Diseases and Medical Microbiology",
"&journal=Canadian Respiratory Journal",
"&journal=Cardiology Research and Practice",
"&journal=Cardiovascular Therapeutics",
"&journal=Case Reports in Anesthesiology",
"&journal=Case Reports in Cardiology",
"&journal=Case Reports in Dermatological Medicine",
"&journal=Case Reports in Emergency Medicine",
"&journal=Case Reports in Endocrinology","Case Reports in Medicine"

]

const hindawi = {
  name: 'hindawi',
  baseURL: 'https://hindawi.com/',
  searchURL: 'https://www.hindawi.com/search/all/',
  queries: {
    sort: '&orderBy=desc',
    years : 'fromYear=2008&toYear=2020',
    
  },
  selectors:{
    jsons : '#__NEXT_DATA__',
    abstract: 'description',
    title: 'title',
    type: 'dc.publisher',
    doi: 'dc.identifier',
    year: 'citation_year',
  }
}

hindawi.crawl = async () =>{
try{
  return await crawl();
}catch(error){
	console.error(error);
}
}

const crawl = async () =>{
  const pub  = journal.join('');
  for( let i = 0; i < keywords.length ;){
    const key = keywords[i];
    const url = genURL(key,1,pub);
    //console.log('URL:',url);
    const html = await getHTML(url);
    if(html !== null){
      const Json = getJsonFromHTML(html);
      if( Json !== null || Json !== undefined){
        const res = getResultFromJSON(Json);
        await crawlEachPages(res,key,pub);
      }
    }
    i++;
  }
  return Promise.resolve('Done');
}


const crawlEachPages = async ({pages},key,pub) => {
  for(let i = 1; i < pages ; ){
    const url = genURL(key,i,pub);
    console.log('\n\nCRAWLING:',url);
    const html = await getHTML(url);
    if(html !== null){
      const Json = getJsonFromHTML(html);
      const urls = getURLsFromJSON(Json);
      const promises = await urls.map(async function(url){
        const html = await getHTML(url);
        if(html !== null){
          const Json = await getJsonFromHTML(html);
          //console.log('JSON:',Json);
          return getArticleFromJson(Json);
        }else{
          console.log('HTML iS: NULL');
          return null;
        }
      })
      const Articles = await Promise.all(promises);
      await insertDB(Articles);
    }
    i++;
  }
}

const getArticleFromJson = (JsonData) => {
  const rawData = JsonData.props.pageProps.meta.meta_data;
  const keys = ['description','title','dc.publisher','citation_year','dc.identifier'];
  const article = {};
  try{
  keys.map(function(key){
    article[key] = rawData.filter(function(obj){
      return obj.name == key;
    })
  })
    const data = cleanData(article);
    data.link = JsonData.props.currentUrl;
    return data;
  }catch(error){
    console.error(error);
    return null;
  }
}

const cleanData = (article) => {
  //console.log('ARTICLE:',article);
  return {
    title: article.title[0].content,
    abstract: article.description[0].content,
    category: 'Hindawi',
    year: article.citation_year[0].content,
    doi: article['dc.identifier'][0].content,
  }
}

const insertDB = async (articles) => {
  const Article = hindawi.Model;
  articles.map(function(article){
    if(article !== null){
      Article.create(article,function(error,results){
        if(error){
          insertErrorHandler(error,article);
        }
      })
    }
  })
}

const getHTML = async (URL) => {
  //const browser = await puppeteer.launch({headless:false});
  //const browser = await puppeteer.launch();
  const browser = await puppeteer.launch({
	headless:true,
	args:['--no-sandbox','--disable-setuid-sandbox'],
  });
  try{
    const page = await browser.newPage();
    await page.goto(URL);
    const html = await page.content();
    return html;

  }catch(err){
    if(err.name == 'TimeoutError'){
      console.log('Web Page Takes to long to response');
      return null;
    }
    console.error(err);
  }finally{
    await browser.close();
  }
}

const getURLsFromJSON = (Json) => {
  try{
    //console.log('JSON:',Json);
    const {articles} = Json.props.pageProps.articleList;
    const urls = [];
    articles.forEach(function(article){
      const url = hindawi.baseURL + article.alias;
      urls.push(url);
    })
    return urls;
  }catch(er){
    console.error(er);
  }
}

const getResultFromJSON = (Json) =>{
  try{
    const {limit,total,articles} = Json.props.pageProps.articleList;
    const pages = Math.ceil(total/limit);
    if((pages > 0) && pages !== null ){
      return {
        total,
        pages
      };
    }
    else{
      throw new Error('Bad Pages Results, Error');
    }
  }
  catch(e){
    console.error(e);
    }
}

const getJsonFromHTML = (rawhtml) => {
  try{
    const $ = cheerio.load(rawhtml,{normalizeWhitespace:true,xmlMode:true});
    const results = $(hindawi.selectors.jsons).html();
    const json = JSON.parse(results); 
    return json;
  }catch(err){
    console.error(err);
    return null;
  }
}


const genURL = (key,page,publication) =>{
  const searchkey = key.replace(/-/g,'+').replace(/ /g,'+').toLowerCase();
  publication = publication.replace(/ /g,'%20');
  const {sort,years} = hindawi.queries;
  return hindawi.searchURL+searchkey+'/page/'+page+'/?'+years+publication+sort;
}

const insertErrorHandler = (error,article) => {
  if(error.name == 'MongoError' && error.code === 11000){
    console.error('Duplicate Key:',article.link);
  }
  if(error.name == 'ValidationError'){
    console.error('\n\n Validation Error:',article.link);
  }
}

module.exports = hindawi;
