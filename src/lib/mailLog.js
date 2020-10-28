const mailman = require('./mailer');

const lib = {};

lib.sendMail = (subject,payload,html) => {
  try{
    const {options,transporter} = mailman;
    options.subject = subject;
    options.text = payload;
    options.html = html;

    transporter.sendMail(options,function(err,info){
      if(err) throw err;
      if(info){
        console.log('Send Mail',info);
      }
    });

  }
  catch (error){
    console.error('MailLog Error',error);
  }
}
