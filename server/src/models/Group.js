module.exports = (sequelize, DataTypes) => {
  const Group = sequelize.define('Group', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    identifierCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  });

  return Group;
};