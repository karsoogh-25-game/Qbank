module.exports = (sequelize, DataTypes) => {
  const Question = sequelize.define('Question', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    // Properties for uploaded file
    filePath: { // مسیر فایل در سرور
      type: DataTypes.STRING,
      allowNull: false,
    },
    filename: { // نام اصلی فایل
      type: DataTypes.STRING,
      allowNull: false,
    },
    mimeType: { // نوع فایل مثل image/png
      type: DataTypes.STRING,
      allowNull: false,
    },
    size: { // حجم فایل به بایت
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    prize: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  });

  return Question;
};