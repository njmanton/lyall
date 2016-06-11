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
  }

}