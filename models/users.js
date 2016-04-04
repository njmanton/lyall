'use strict';

var moment  = require('moment'),
      mail  = require('../mail'),
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
          raw: true,
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
            var name = preds[x]['user.username'];
            if (!(name in table)) {
              table[name] = {
                name: name,
                id: preds[x]['user.id'],
                points: 0,
                preds: 0,
                cs: 0,
                cd: 0,
                cr: 0
              }
            }
            // only recalc a prediction if pred.points is null, and there's a result
            // otherwise count the points

            table[name].points += preds[x]['points'];
            switch (preds[x]['points']) {
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
        return models.Pred.findAll({
          where: { user_id: uid },
          raw: true,
          attributes: ['id', 'prediction', 'joker', 'points'],
          include: [{
            model: models.Match,
            attributes: [
              'id', 
              'result',
              'date',
              [models.sequelize.fn('date_format', models.sequelize.col('date'), '%a, %e %b %H:%i'), 'displaydate'],
              'group', 
              'stage'
            ]
          }]
        }).then(function(preds) {
          
          for (var x = 0; x < preds.length; x++) {
            var then = moment(preds[x]['match.date']).startOf('day');
            preds[x].expired = ((moment().isAfter(then)) || (preds[x]['match.result'] !== null));
          }
          return true;
        })
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
          
        })
      } // end invite
    }
  }, {
    tableName: 'users',
    freezeTableName: true
  });
};

