const driver = process.env.DATABASE_URL
  ? require('./postgres')
  : require('./sqlite');

module.exports = driver;
