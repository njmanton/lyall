// jshint node: true, esversion: 6
'use strict';

var models  = require('../models'),
    folder  = 'goals',
    utils   = require('../utils');

module.exports = {

  delete_id: [utils.isAdmin, function(req, res, id) {
    models.Goal.destroy({
      where: { id: id }
    }).then(r => {
      console.log('deleted a row', r);
      res.send(r > 0);
    })
  }],

  post_add: [utils.isAdmin, function(req, res) {
    if (!req.body.scorer || !req.body.team || req.body.time < 1 || req.body.time > 90) {
      req.flash('error', 'something wrong with that data');
      res.redirect(req.headers.referer);
    } else {
      models.Goal.create({
        match_id: req.body.match_id,
        team_id: req.body.team,
        scorer: req.body.scorer,
        time: req.body.time,
        tao: req.body.tao,
        type: req.body.type
      }).then(goal => {
        if (goal) {
          req.flash('success', 'Goal added');
        } else {
          req.flash('error', 'Couldn\'t save data');
          console.log('err');
        }
        res.redirect(req.headers.referer);
      })      
    }
    
  }],

  get_index: function(req, res) {
    models.Goal.findAll({
      attributes: ['id', 'scorer', 'time', 'tao', 'type', 'match_id'],
      include: {
        model: models.Team,
        attributes: ['id', 'name', 'sname']
      }
    }).then(goals => {
      res.render(folder + '/index', {
        title: 'Goals',
        goals: goals
      })
    })
  },

  get_times: [utils.isAjax, function(req, res) {
    models.Goal.findAll({
      attributes: ['id', 'scorer', 'time', 'type', 'tao', 'team_id'],
      order: ['time', 'tao'],
      include: {
        model: models.Match,
        attributes: ['id', 'date', 'result'],
        include: [{
          model: models.Team,
          as: 'TeamA',
          attributes: ['id', 'name']
        }, {
          model: models.Team,
          as: 'TeamB',
          attributes: ['id', 'name']
        }]
      }
    }).then(goals => {
      goals.map(g => { g.home = (g.team_id == g.match.TeamA.id) });
      //res.send(goals);

      var data = [], prev = null, yaxis = 0.9;
      for (var x = 0; x < goals.length; x++) {
        var g = goals[x],
            color = null;
        if (g.type == 'P') {
          color = 'rgb(0, 0, 128)';
        } else if (g.type == 'O') {
          color = 'rgb(0, 128, 0)';
        } else {
          color = null;
        }
        if ((g.time + g.tao) == prev) {
          yaxis += 0.1;
        } else {
          yaxis = 0.9
        }
        data.push({
          x: (g.time + g.tao),
          y: yaxis,
          match: g.match.id,
          color: color,
          scorer: g.scorer,
          team: g.home ? g.match.TeamA.name : g.match.TeamB.name,
          oppo: g.home ? g.match.TeamB.name : g.match.TeamA.name,
          type: g.type
        });
        prev = (g.time + g.tao);
      }
      res.send(data);
    })
  }],

  get_cumulative: function(req, res) {
    models.Match.findAll({
      order: ['date'],
      attributes: ['result'],
      where: { result: { $ne: null } }
    }).then(matches => {
      let goals = [], sum = 0;
      for (var x = 0; x < matches.length; x++) {
        var g = matches[x].result.split('-').reduce((p, c) => { return p + (c * 1) }, 0);
        sum += g;
        goals.push(sum);
      }
      res.render(folder + '/cumulative', {
        title: 'Cumulative goals scored',
        goals: JSON.stringify(goals)
      })
    })
  }

}