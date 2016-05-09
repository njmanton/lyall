// jshint node: true, esversion: 6
'use strict';

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('matches', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    teama_id: {
      type: DataTypes.INTEGER(4),
      allowNull: true
    },
    teamb_id: {
      type: DataTypes.INTEGER(4),
      allowNull: true
    },
    result: {
      type: DataTypes.STRING,
      allowNull: true
    },
    date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    winmethod: {
      type: DataTypes.INTEGER(4),
      allowNull: true
    },
    venue_id: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    },
    group: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '0'
    },
    stage: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '0'
    },
    stageorder: {
      type: DataTypes.INTEGER(4),
      allowNull: false
    }
  }, {
    tableName: 'matches',
    freezeTableName: true
  }, {
    classMethods: {
      listByGroup: function(models) {
        return this.findAll({
          attributes: [
            'id', 
            'result', 
            [models.sequelize.fn('date_format', models.sequelize.col('date'), '%a, %e %b %H:%i'), 'date'],
            'group'
          ],
          include: [{
            model: models.Team,
            as: 'TeamA',
            attributes: ['id', 'name']
          }, {
            model: models.Team,
            as: 'TeamB',
            attributes: ['id', 'name']
          }, {
            model: models.Venue,
            attributes: ['id', 'stadium', 'city']
          }]
        }).then(function(data) {

        });
      }
    }
  });
};
