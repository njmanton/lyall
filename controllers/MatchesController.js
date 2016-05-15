// jshint node: true, esversion: 6
'use strict';

var models  = require('../models'),
    folder  = 'matches',
    moment  = require('moment'),
    ga      = require('group-array'),
    utils   = require('../utils'),
    cfg     = require('../config/cfg'),
    chalk   = require('chalk');

module.exports = {

  get_index: function(req, res) {
    models.Match.findAll({
      order: 'stageorder DESC, date ASC',
      where: [{ teama_id: { ne: null } }, { teamb_id: { ne: null } }],
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
    }).then(data => {
      data.map(m => { m.fdate = moment(m.date).format('ddd DD MMM, HH:mm'); });
      res.render(folder + '/index', {
        title: 'Goalmine | Matches',
        matches: ga(data, 'stage')
      });
    });
  },

  get_id: function(req, res, id) {
    var match = models.Match.findOne({
      where: { id: id },
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
      }, {
        model: models.Goal,
        attributes: ['id', 'team_id', 'scorer', 'type', 'time', 'tao']
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
          let placeholders = [];
          if (match.stage.length > 1) {
            placeholders = match.group.split('v');
          }
          let then = moment(match.date).startOf('day');
          match.ta = (match.TeamA) ? match.TeamA.name : placeholders[0];
          match.tb = (match.TeamB) ? match.TeamB.name : placeholders[1];
          match.fdate = moment(match.date).format('ddd DD/MM HH:mm');
          match.goals.map(m => { m.home = (match.TeamA.id == m.team_id) });
          res.render(folder + '/view', {
            title: `Goalmine |  ${match.ta} vs ${match.tb}`,
            match: match,
            preds: preds,
            visible: (moment().isAfter(then) || cfg.ignoreExpiry || (match.id < 37 ))
          });          
        } else {
          res.status(404).render('errors/404');
        }

      }
    );
  },

  get_id_result: [utils.isAdmin, function(req, res, id) {

    models.Match.findOne({
      where: { id: id },
      attributes: ['id', 'result', 'group', 'stage'],
      include: [{
        model: models.Team,
        as: 'TeamA',
        attributes: ['id', 'name', 'sname']
      }, {
        model: models.Team,
        as: 'TeamB',
        attributes: ['id', 'name', 'sname']
      }, {
        model: models.Goal,
        attributes: ['id', 'team_id', 'scorer', 'type', 'time', 'tao']
      }]
    }).then(match => {
      if (!match) {
        res.status(404).render('errors/404');
      } else {
        match.goals.map(m => { m.home = (match.TeamA.id == m.team_id) });
        res.render(folder + '/result', {
          title: 'Edit Result',
          match: match
        })
      }
    });

  }],

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