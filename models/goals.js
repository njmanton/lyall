// jshint node: true, esversion: 6
'use strict';

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('goals', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    match_id: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    },
    team_id: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    },
    scorer: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '0'
    },
    type: {
      type: DataTypes.ENUM('P','O'),
      allowNull: true
    },
    time: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '0'
    },
    tao: {
      type: DataTypes.INTEGER(4),
      allowNull: true
    }
  }, {
    tableName: 'goals',
    freezeTableName: true
  });
};
