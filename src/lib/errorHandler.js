const _log = require('./log');

const lib = {};

//mongoDB Insert Related Error
lib.mongoInsertError = (error,article) => {
 if(error.name = 'MongoError' && error.code ===11000){
   //create error payload,
   const errorPayload = {
     time: new Date(),
     error: {
       name: 'Duplicate Key',
       code: error.code,
       source: article.link,
       message: 'Duplicate Entry trying to insert in database',
     }
   }
   //convert json format to string
   const errorStr = JSON.stringify(errorPayload);
   const fileName = 'Duplicate_Key_Error';

   //write it to log file.
   _log.append(fileName,errorStr,function(error){
      if(!error){
        console.log('Successfuly append Error to logfile: ',fileName);
      }else{
        console.error(error);
      }
   });
 }
  if(error.name == 'ValidationError'){
    const errorPayload = {
      time: new Date(),
      error: {
        name : 'ValidationError',
        source: article.link,
      }
    }

    //json to string
    const errorStr = JSON.stringify(errorPayload);
    const fileName = 'Validation_Error';
    _log.append(fileName,errorStr,function(error){
      if(!error){
        console.log('Appended Error to logfile:',fileName);
      }else{
        console.error(error);
      }
    });
  }
}

//mongoDB migration Error
lib.mongoMigrateError = (error) => {

}

//general broken crawling scripts error;
lib.scriptError = (error) =>{
 console.error(error); 
}


//when everything is broken
lib.generalBrokenError = (error) => {

}


module.exports = lib;
