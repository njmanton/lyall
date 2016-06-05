// jshint node: true, esversion: 6
'use strict';

let _ = require('lodash');

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
    classMethods: {
      table: function(models, id) {
        return models.Match.findAll({
          where: { group: [sequelize.literal('SELECT `group` FROM teams WHERE id = ' + id)] },
          attributes: ['id', 'result'],
          include: [{
            model: models.Team,
            as: 'TeamA',
            attributes: ['id', 'name', 'sname']
          }, {
            model: models.Team,
            as: 'TeamB',
            attributes: ['id', 'name', 'sname']
          }]
        }).then(function(matches) {
          let group = {};
          for (let x = 0; x < matches.length; x++) {
            let m = matches[x],
                home = m.TeamA.name,
                away = m.TeamB.name;
            if (!(home in group)) {
              group[home] = {
                id: m.TeamA.id,
                name: m.TeamA.name,
                pl: 0,
                w: 0,
                d: 0,
                l: 0,
                gf: 0,
                ga: 0,
                pts: 0
              };
            }
            if (!(away in group)) {
              group[away] = {
                id: m.TeamB.id,
                name: m.TeamB.name,
                pl: 0,
                w: 0,
                d: 0,
                l: 0,
                gf: 0,
                ga: 0,
                pts: 0
              };
            }
            if (m.result) {
              let goals = m.result.split('-').map(function(e) { return e * 1; });
              group[home].pl++;
              group[away].pl++;
              group[home].gf += goals[0];
              group[away].ga += goals[0];
              group[away].gf += goals[1];
              group[home].ga += goals[1];
              if (goals[0] > goals[1]) {
                group[home].w++;
                group[away].l++;
                group[home].pts += 3;
              } else if (goals[1] > goals[0]) {
                group[away].w++;
                group[home].l++;
                group[away].pts += 3;
              } else {
                group[home].d++;
                group[away].d++;
                group[home].pts++;
                group[away].pts++;
              }            
            }
          }
          var table = [];
          for (var prop in group) {
            table.push(group[prop]);
          }
          table.map(t => t.gd = t.gf - t.ga);
          return _.orderBy(table, ['pts', 'gd', 'gf'], ['desc', 'desc', 'desc']);

        });
      }
    }
  }, {
    tableName: 'teams',
    freezeTableName: true
  });
};
