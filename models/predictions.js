// jshint node: true, esversion: 6
'use strict';

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('predictions', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    match_id: {
      type: DataTypes.INTEGER(6),
      allowNull: false,
      defaultValue: '0'
    },
    user_id: {
      type: DataTypes.INTEGER(6),
      allowNull: false,
      defaultValue: '0'
    },
    joker: {
      type: DataTypes.INTEGER(6),
      allowNull: false,
      defaultValue: '0'
    },
    prediction: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '0'
    },
    points: {
      type: DataTypes.INTEGER(6),
      allowNull: true,
      defaultValue: '0'
    }
  }, {
    tableName: 'predictions',
    freezeTableName: true
  });
};
