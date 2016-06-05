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
      data.map(m => { m.fdate = moment(m.date).format('DD MMM, ha'); });
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
          let then = moment(match.date).startOf('day').add(12, 'h');
          match.ta = (match.TeamA) ? match.TeamA.name : placeholders[0];
          match.tb = (match.TeamB) ? match.TeamB.name : placeholders[1];
          match.scores = (match.result) ? match.result.split('-') : ['-', '-'];
          match.fdate = moment(match.date).format('ddd DD/MM ha');
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

  get_id_heatmap: [utils.isAjax, function(req, res, id) {
    let mid = (id * 1);
    if (mid < 1 || mid > 51 || isNaN(mid)) { res.sendStatus(404); return false; }

    let qry = 'SELECT prediction, COUNT(id) AS cnt FROM predictions WHERE match_id=' + mid + ' GROUP BY prediction';
    var preds = models.sequelize.query(qry, { type: models.sequelize.QueryTypes.SELECT });
    var result = models.Match.findById(id, {
      attributes: ['result', 'date']
    });
    models.sequelize.Promise.join(
      preds,
      result,
      function(preds, result) {
        let then = moment(result.date).startOf('day').add(12, 'h');
        if (moment().isAfter(then)) {
          let hm_data = [],
              sumprod = [0, 0],
              total_preds = 0,
              rs = [];
          if (result && result.result) {
            rs = result.result.split('-').map(x => x * 1);
          }            
          for (var i = preds.length - 1; i >= 0; i--) {
            var goals = preds[i].prediction.split('-');
            sumprod[0] += (preds[i].cnt * (goals[0] * 1));
            sumprod[1] += (preds[i].cnt * (goals[1] * 1));
            total_preds += preds[i].cnt;
            hm_data.push([goals[0] * 1, goals[1] * 1, preds[i].cnt]);
          };
          res.send({
            counts: hm_data,
            mean: sumprod.map(x => parseFloat((x / total_preds).toFixed(2))),
            result: rs
          });
        } else {
          res.sendStatus(403);
        }

      })
  }],

  post_id_result: [utils.isAdmin, function(req, res, id) {
    // ajax post to update score
    // post format { id: <match id>, result: <match result> }
    var result = req.body.result;
    models.Match.update({
      result: result
    }, {
      where: { id: id }
    }).then(function(rows) {
      // loop through each promise to update prediction scores
      var preds = models.Pred.findAll({
        where: { match_id: id }
      });
      var p = 0;
      models.sequelize.Promise.each(preds, function(pred) {
        let pts = utils.calc(pred.prediction, result, pred.joker);
        pred.update({
          points: pts
        })
        p++;
      }).then(e => {
        req.flash('info', 'Result set to ' + result + '. ' + e.length + ' predictions updated');
        res.redirect('/matches/' + id);        
      })
    })
  }]

};
