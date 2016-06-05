// jshint node: true, esversion: 6
'use strict';

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('venues', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    year: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    hosts: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '0'
    },
    champions: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '0'
    }, 
    champion_id: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: '0'
    },
    golden_shoe: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '0'
    },
    goals: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'tournaments',
    freezeTableName: true
  });
};