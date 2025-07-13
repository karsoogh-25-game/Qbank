const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database.js').development;

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    dialect: config.dialect,
    logging: false
  }
);

const db = {};

db.Group = require('./Group.js')(sequelize, DataTypes);
db.Question = require('./Question.js')(sequelize, DataTypes);
db.Submission = require('./Submission.js')(sequelize, DataTypes);
db.Admin = require('./Admin.js')(sequelize, DataTypes);

// تعریف روابط
db.Group.hasMany(db.Submission);
db.Submission.belongsTo(db.Group);

db.Question.hasMany(db.Submission);
db.Submission.belongsTo(db.Question);

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;