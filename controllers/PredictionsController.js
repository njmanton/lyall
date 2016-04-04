'use strict';

var models  = require('../models'),
    folder  = 'predictions',
    utils   = require('../utils'),
    chalk   = require('chalk'),
    moment  = require('moment'),
    bp      = require('body-parser');

module.exports = {

  get_index: [utils.isAuthenticated, function(req, res) {
    // requires logged-in user
    models.User.predictions(models, req.user.id).then(function(preds) {
      console.log(chalk.bgYellow(preds));
      res.render('players/predictions', {
        title: 'My Predictions',
        table: preds
      });
    })
  }],

  post_update: [utils.isAuthenticated, utils.isAjax, function(req, res) {
    // receives prediction made via ajax
    // process new prediction
    // post format { id: <user id>, mid: <match id>, pred: <prediction> }
    models.Match.findById(req.body.id, { attributes: ['date'] }).then(function(match) {
      let then = moment(match.date).startOf('day');
      if (moment().isAfter(then) || match.result) {
        
        res.send(false);

      } else {

        models.Pred.findOne({
          where: [{ user_id: req.body.id }, { match_id: req.body.mid }]
        }).then(function(pred) {

          if (pred) {
            pred.update({ prediction: req.body.pred }).then(function() { res.send('update'); });
          } else {
            models.Pred.create({
              user_id: req.body.id,
              match_id: req.body.mid,
              prediction: req.body.pred
            }).then(function() { res.send('create'); })
          }

        }).catch(function(e) {
          console.log(e);
          res.send(false);
        })

      }
    })
    
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
      let then = moment(pred.match.date).startOf('day');
      group_expired = group_expired || (moment().isAfter(then) && pred.joker == 1);
      if (!moment().isAfter(then) && !group_expired) {
        pred.update({
          joker: (req.body.mid == pred.match_id)
        })
      }
    })
    res.send(true);
  }]

}