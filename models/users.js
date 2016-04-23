// jshint node: true, esversion: 6
'use strict';

let moment  = require('moment'),
      mail  = require('../mail'),
        ga  = require('group-array'),
     utils  = require('../utils'), 
         _  = require('lodash');

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('users', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '0'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '0'
    },
    facebook_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    google_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '0'
    },
    admin: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '0'
    },
    lastlogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    referredby: {
      type: DataTypes.INTEGER(6),
      allowNull: true
    },
    paid: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '0'
    },
    resetpwd: {
      type: DataTypes.STRING,
      allowNull: true
    },
    validated: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '0'
    }
  }, {
    classMethods: {
      table: function(models) {
        return models.Pred.findAll({
          attributes: ['id', 'prediction', 'joker', 'points'],
          include: [{
            model: models.User,
            attributes: ['id', 'username'],
          }, {
            model: models.Match,
            attributes: ['id', 'result', 'group', 'stage']
          }]
        }).then(function(preds) {
          var table = {};
          for (var x = 0; x < preds.length; x++) {
            var name = preds[x].user.username;
            if (!(name in table)) {
              table[name] = {
                name: name,
                id: preds[x].user.id,
                points: 0,
                preds: 0,
                cs: 0,
                cd: 0,
                cr: 0
              };
            }

            table[name].points += preds[x].points;
            switch (preds[x].points) {
              case 5:
              case 10:
                table[name].cs++;
                break;
              case 3:
              case 6:
                table[name].cd++;
                break;
              case 1:
              case 2:
                table[name].cr++;
            }

          }

          // sort the table
          var league = [];
          for (var prop in table) {
            league.push(table[prop]);
          }
          return _.orderBy(league, ['points', 'cs', 'cd', 'cr'], ['desc', 'desc', 'desc', 'desc']);
        });
      },
      predictions: function(models, uid) {
        return models.Match.findAll({
          where: [{ teama_id: { ne: null } }, { teamb_id: { ne: null } }],
          attributes: ['id', 'result', 'date', 'group', 'stage'],
          order: 'stageorder DESC, id',
          include: [{
            model: models.Pred,
            attributes: ['id', 'joker', 'prediction', 'points'],
            where: { user_id: uid },
            required: false
          }, {
            model: models.Team,
            as: 'TeamA',
            attributes: ['id', 'name', 'sname']
          }, {
            model: models.Team,
            as: 'TeamB',
            attributes: ['id', 'name', 'sname']
          }, {
            model: models.Venue,
            attributes: ['id', 'stadium', 'city']
          }]
        }).then(function(matches) {
          let preds = [];
          for (var x = 0; x < matches.length; x++) {
            let m = matches[x];
            console.log(m);
            let pred = {
              mid: m.id,
              group: m.group,
              stage: m.stage,
              result: m.result,
              teama: {
                id: m.TeamA.id,
                name: m.TeamA.name,
                sname: m.TeamA.sname
              },
              teamb: {
                id: m.TeamB.id,
                name: m.TeamB.name,
                sname: m.TeamB.sname
              },
              venue: {
                id: m.venue.id,
                stadium: m.venue.stadium,
                city: m.venue.city
              }
            };
            if (m.predictions[0]) {
              pred.pid = m.predictions[0].id;
              pred.pred = m.predictions[0].prediction;
              pred.joker = m.predictions[0].joker;
              pred.pts = m.predictions[0].points;
            }
            let then = moment(m.date).startOf('day');
            pred.expired = moment().isAfter(then) || !!m.result;
            preds.push(pred);
          }
          return ga(preds, 'stage');
        });
      },
      invite: function(body, referrer) {
        // validate inputs: body.email, body.copy
        // get a temporary code
        const code = utils.getTempName(8);

        return this.create({
          username: code,
          email: body.email,
          password: code,
          referredby: referrer.id
        }).then(function(invite) {
          
          var template  = 'invite.hbs',
              subject   = 'Invitation',
              context   = {
                name: referrer.username,
                email: referrer.email,
                code: code
              };

          var cc = (body.copy) ? referrer.email : null;
          mail.send(invite.email, cc, subject, template, context, function(mail_result) {
            return [invite, mail_result];
          });
          
        });
      } // end invite
    }
  }, {
    tableName: 'users',
    freezeTableName: true
  });
};

