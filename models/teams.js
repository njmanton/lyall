/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('teams', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    group: {
      type: DataTypes.STRING,
      allowNull: false
    },
    sname: {
      type: DataTypes.STRING,
      allowNull: false
    },
    ranking: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    coach: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'teams',
    freezeTableName: true
  });
};
