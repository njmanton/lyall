// jshint node: true, esversion: 6
'use strict';

var models  = require('../models'),
    folder  = 'matches',
    moment  = require('moment'),
    _       = require('lodash'),
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
          let then = moment(match.date).startOf('day').add(19, 'h');
          match.ta = (match.TeamA) ? match.TeamA.name : placeholders[0];
          match.tb = (match.TeamB) ? match.TeamB.name : placeholders[1];
          match.scores = (match.result) ? match.result.split('-') : ['-', '-'];
          match.fdate = moment(match.date).format('ddd DD/MM ha');
          var goals = { home: {}, away: {} };
          for (var x = 0; x < match.goals.length; x++) {
            let goal = match.goals[x],
                time = goal.time + ((goal.tao) ? ('+' + goal.tao) : '') + "'",
                team = (match.TeamA.id == goal.team_id) ? 'home': 'away';
            if (!(goal.scorer in goals[team])) {
              goals[team][goal.scorer] = {
                times: time
              }
            } else {
              goals[team][goal.scorer].times += (', ' + time);
            }
            if (goal.type == 'P') {
              goals[team][goal.scorer].times += ' (p)';
            } else if (goal.type == 'O') {
              goals[team][goal.scorer].times += ' (o.g.)';
            }
          }
          res.render(folder + '/view', {
            title: `Goalmine |  ${match.ta} vs ${match.tb}`,
            match: match,
            goals: goals,
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
        let then = moment(result.date).startOf('day').add(19, 'h');
        if (moment().isAfter(then) || id < 37) {
          let hm_data = [],
              sumprod = [0, 0],
              total_preds = 0,
              rs = [];
          if (result && result.result) {
            rs = result.result.split('-').map(x => x * 1);
          }            
          for (var i = preds.length - 1; i >= 0; i--) {
            var goals = preds[i].prediction.split('-');
            if (goals.length == 2) {
              sumprod[0] += (preds[i].cnt * (goals[0] * 1));
              sumprod[1] += (preds[i].cnt * (goals[1] * 1));
              total_preds += preds[i].cnt;
              hm_data.push([goals[0] * 1, goals[1] * 1, preds[i].cnt]);              
            }
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
  }],

  get_id_goals: [utils.isAdmin, function(req, res, id) {
    models.Match.findById(id, {
      where: { result: { ne: null } },
      attributes: [
        'id', 
        'result',
        'date', 
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
        model: models.Goal,
        attributes: ['id', 'team_id', 'scorer', 'type', 'time', 'tao'],
        include: {
          model: models.Team,
          attributes: ['id', 'name']
        }
      }]
    }).then(match => {
      if (match.result) {
        res.render(folder + '/goals', {
          title: 'Goals',
          match: match
        })
      } else {
        res.status(404).render('errors/404');
      }
    })

  }],

  get_points: [utils.isAjax, function(req, res) {
    models.Match.findAll({
      where: { result: { $ne: null } },
      attributes: [
        'id', 
        'result',
      ],
      include: [{
        model: models.Team,
        as: 'TeamA',
        attributes: ['name']
      }, {
        model: models.Team,
        as: 'TeamB',
        attributes: ['name']
      }, {
        model: models.Pred,
        attributes: ['points', 'joker']
      }]
    }).then(matches => {
      let data = [], labels = [], jokers = [], points = [];
      for (let x = 0; x < matches.length; x++) {
        //labels.push(matches[x].TeamA.name + ' v ' + matches[x].TeamB.name);
        //jokers.push(matches[x].predictions.reduce((p, v) => { return p += v.joker }, null));
        //points.push({
        //  id: matches[x].id,
        //  y: matches[x].predictions.reduce((p, v) => { return p += v.points }, 0)
        //})
        var match = {
          labels: matches[x].TeamA.name + ' v ' + matches[x].TeamB.name,
          jokers: matches[x].predictions.reduce((p, v) => { return p += v.joker }, null),
          points: {
            id: matches[x].id,
            y: matches[x].predictions.reduce((p, v) => { return p += v.points }, 0)
          }
        }
        data.push(match);
      }
      data = _.orderBy(data, ['points.y'], ['desc']);

      for (var x = 0; x < data.length; x++) {
        labels.push(data[x].labels);
        jokers.push(data[x].jokers);
        points.push(data[x].points);
      }
      res.send({
        labels: labels, 
        jokers: jokers, 
        points: points
      });
    })
  }]

};
