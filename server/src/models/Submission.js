module.exports = (sequelize, DataTypes) => {
  const Submission = sequelize.define('Submission', {
    answerFilePath: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('solving', 'waiting', 'correct', 'wrong'),
      allowNull: false,
      defaultValue: 'solving'
    }
  });

  return Submission;
};