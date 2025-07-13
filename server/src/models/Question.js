module.exports = (sequelize, DataTypes) => {
  const Question = sequelize.define('Question', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    imagePath: {
      type: DataTypes.STRING,
      allowNull: false
    },
    prize: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  });

  return Question;
};