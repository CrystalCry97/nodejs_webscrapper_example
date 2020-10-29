
const URI = `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB_NAME}?authSource=${process.env.MONGO_DB_NAME}&ssl=false`;
const URI2 = `mongodb://${process.env.MONGO2_USERNAME}:${process.env.MONGO2_PASSWORD}@${process.env.MONGO2_HOST}:${process.env.MONGO2_PORT}/${process.env.MONGO2_DB_NAME}?authSource=${process.env.MONGO2_DB_NAME}&ssl=false`

module.exports = {URI,URI2};
