const mailer = require('nodemailer');

const mailman = {};

mailman.info = {
  port : process.env.MAIL_PORT,
  host : process.env.MAIL_HOST,
  auth : {
    user : process.env.MAIL_USER,
    pass : process.env.MAIL_PASS,
  },
}

mailman.options = {
  from : 'No Reply Crawlers',
  to   : process.env.CRAWLER_ADMIN_EMAIL,
}

mailman.transporter = mailer.createTransport(mailman.sender);

module.exports = mailman;
