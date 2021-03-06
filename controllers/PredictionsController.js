// jshint node: true, esversion: 6
'use strict';

var models  = require('../models'),
    folder  = 'predictions',
    utils   = require('../utils'),
    chalk   = require('chalk'),
    moment  = require('moment');

module.exports = {

  get_index: [utils.isAuthenticated, function(req, res) {
    // requires logged-in user
    models.User.predictions(models, req.user.id).then(function(preds) {
      for (var group in preds) {
        if (!preds.hasOwnProperty(group)) continue;
        var group_expired = false;
        for (var x = 0; x < preds[group].length; x++) {
          if (preds[group][x].expired && preds[group][x].joker) {
            group_expired = true;
          }
          preds[group][x].group_expired = preds[group][x].expired || group_expired;
        }
      }
      res.render('players/predictions', {
        title: 'My Predictions',
        table: preds
      });
    });
  }],

  post_update: [utils.isAuthenticated, utils.isAjax, function(req, res) {
    // receives prediction made via ajax
    // process new prediction
    // post format { id: <user id>, mid: <match id>, pred: <prediction> }
    models.Match.findById(req.body.mid, { attributes: ['date'] }).then(function(match) {
      let then = moment(match.date).startOf('day').add(19, 'h');
      if (moment().isAfter(then) || match.result) {
        res.sendStatus(403);
      } else if (!req.body.pred.match(/\b\d{1,2}-\d{1,2}\b/)) {
        res.sendStatus(400);
      } else {

        models.Pred.findOne({
          where: [{ user_id: req.body.id }, { match_id: req.body.mid }]
        }).then((pred) => {

          if (pred) {
            pred.update({ prediction: req.body.pred }).then(function() { res.send('update'); });
          } else {
            models.Pred.create({
              user_id: req.body.id,
              match_id: req.body.mid,
              prediction: req.body.pred,
              joker: 1
            }).then(function() { res.send('create'); });
          }

        }).catch(function(e) {
          console.log(e);
          res.send(false);
        });

      }
    });
    
  }],

  post_joker: [utils.isAuthenticated, utils.isAjax, function(req, res) {
    // get joker change
    // post format { id: <user id>, mid: <match id>, stage: <match stage> }
    
    // get all preds for user and _stage_ in date order
    // iterate over them, if one is set and expired, exit
    // otherwise set each to the value of match_id == req.body.mid

    let preds = models.Pred.findAll({
      attributes: ['id', 'user_id', 'match_id', 'joker'],
      where: { user_id: req.body.id },
      include: {
        model: models.Match,
        attributes: ['date', 'result'],
        where: { stage: req.body.stage },
        order: ['date']
      }
    });
    var group_expired = false;
    models.sequelize.Promise.each(preds, function(pred) {
      let then = moment(pred.match.date).startOf('day').add(19, 'h');
      group_expired = group_expired || (moment().isAfter(then) && pred.joker == 1);
      if (!moment().isAfter(then) && !group_expired) {
        pred.update({
          joker: (req.body.mid == pred.match_id)
        });
      }
    });
    res.send(true);
  }]

};