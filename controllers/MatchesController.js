// jshint node: true, esversion: 6
'use strict';

var models  = require('../models'),
    folder  = 'matches',
    moment  = require('moment'),
    ga      = require('group-array'),
    utils   = require('../utils'),
    cfg     = require('../config/cfg'),
    chalk   = require('chalk'),
    bp      = require('body-parser');

module.exports = {

  get_index: function(req, res) {
    models.Match.findAll({
      order: 'stageorder DESC',
      where: [{ teama_id: { ne: null } }, { teamb_id: { ne: null } }],
      attributes: [
        'id', 
        'result', 
        [models.sequelize.fn('date_format', models.sequelize.col('date'), '%a %e/%m, %H:%i'), 'date'],
        'group',
        'stage'
      ],
      include: [{
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
    }).then(function(data) {
      res.render(folder + '/index', {
        title: 'Goalmine | Matches',
        matches: ga(data, 'stage')
      });
    });
  },

  get_id: function(req, res, id) {
    var match = models.Match.findOne({
      where: {id: id},
      attributes: [
        'id', 
        'result',
        'date', 
        'group', 
        'stage'
      ],
      include: [{
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
    });
    var preds = models.Pred.findAll({
      where: { match_id: id },
      attributes: ['id', 'joker', 'prediction', 'points'],
      include: [{
        model: models.User,
        attributes: ['id', 'username']
      }]
    });
    // join the promises together and fulfil them
    models.sequelize.Promise.join(
      match,
      preds,
      function(match, preds) {
        if (match) {
          var then = moment(match.date).startOf('day'),
              ta = (match.TeamA) ? match.TeamA.name : 'tba',
              tb = (match.TeamB) ? match.TeamB.name : 'tba';

          match.fdate = moment(match.date).format('ddd DD/MM HH:mm')
          res.render(folder + '/view', {
            title: `Goalmine |  ${ta} vs ${tb}`,
            match: match,
            preds: preds,
            visible: (moment().isAfter(then) || cfg.ignoreExpiry)
          });          
        } else {
          res.status(404).render('errors/404');
        }

      }
    );
  },

  post_result: [utils.isAdmin, utils.isAjax, function(req, res) {
    // ajax post to update score
    // post format { mid: <match id>, result: <match result> }
    var result = req.body.result;
    models.Match.update({
      result: result
    }, {
      where: { id: req.body.id }
    }).then(function(rows) {
      // loop through each promise to update prediction scores
      var preds = models.Pred.findAll({
        where: { match_id: req.body.mid }
      });
      models.sequelize.Promise.each(preds, function(pred) {
        let pts = utils.calc(pred.prediction, result, pred.joker);
        pred.update({
          points: pts
        });
      });
      res.send(rows > 0);
    });
  }]

};