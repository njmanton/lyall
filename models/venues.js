/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('venues', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    stadium: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '0'
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '0'
    },
    capacity: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    }
  }, {
    tableName: 'venues',
    freezeTableName: true
  });
};
