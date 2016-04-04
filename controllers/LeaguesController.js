'use strict';

var models  = require('../models'),
    folder  = 'leagues',
    chalk   = require('chalk'),
    utils   = require('../utils'),
    cfg     = require('../config/cfg.js'),
    bp      = require('body-parser');

module.exports = {

  get_index: function(req, res) {
    models.League.findAll({
      raw: true,
      where: { 'pending': 0 },
      attributes: [
        'id',
        'name',
        'description',
        'public'
      ],
      include: [{
        model: models.User,
        attributes: ['id', 'username']
      }]
    }).then(function(leagues) {
      res.render(folder + '/index', {
        title: 'User Leagues',
        data: leagues
      })
    })
  },

  get_id: function(req, res, id) {
    var league = models.League.findById(id, {
      raw: true,
      include: [{
        model: models.User,
        attributes: ['id', 'username']
      }]
    });
    var players = models.League.table(models, id);
    models.sequelize.Promise.join(
      league,
      players,
      function(league, players) {
        if (league) {
          res.render(folder + '/view', {
            title: `Goalmine | ${league.name}`,
            league: league,
            players: players
          })          
        } else {
          res.sendStatus(404);
        }

      }
    );
  },

  get_create: [utils.isAuthenticated, function(req, res) {
    res.render(folder + '/create', {
      title: 'Goalmine | New League'
    })
  }],

  get_available_league: [utils.isAjax, function(req, res, league) {
    // checks whether typed league in users/confirm is available
    models.League.findOne({
      where: { name: league }
    }).then(function(found) {
      res.send(found == null);
    })
  }],

  post_create: [utils.isAuthenticated, function(req, res) {
    models.League.create({

      name: req.body.name,
      description: req.body.description,
      public: req.body.public || 0,
      organiser: req.user.id || 0

    }).then(function(league) {

      if (league) {
        req.flash('info', 'Thanks, your request has been submitted');
      } else {
        req.flash('error', 'Sorry, we were unable to submit that request');
      }
      res.redirect('/leagues');

    }).catch(function(e) {

      console.log(chalk.bgRed('post_create_err'), e);

    })

  }],

  get_id_join: [utils.isAuthenticated, function(req, res, id) {
    models.League.findById(id).then(function(league) {
      models.League_User.create({
        user_id: req.user.id,
        league_id: id,
        confirmed: league.public
      }).then(function() {

        if (league && league.public == 1) {
          req.flash('success', 'You are now a member of this league');
        } else {
          // email organiser
          req.flash('info', 'Your request has been forwarded to the league organiser');
        }
        res.redirect('/leagues/' + id);

      }).catch(function(e) {

        if (e.name == 'SequelizeUniqueConstraintError') {
          req.flash('error', 'You are already a member or pending member of this league');
          res.redirect('/leagues/' + id);
        } else {
          res.send(e);
        }

      })
    }).catch(function(e) {
      res.send(e);
    })

  }],

  get_pending: [utils.isAjax, utils.isAdmin, function(req, res) {
    // get a list of all pending league requests
    models.League.findAll({
      where: { pending: 1 },
      attributes: ['id', 'name', 'description', 'public'],
      include: {
        model: models.User,
        attributes: ['id', 'username']
      }
    }).then(function(leagues) {
      res.send(leagues);
    }).catch(function(e) {
      console.log('get_pending', e);
    })
  }],

  post_pending: [utils.isAdmin, utils.isAjax, function(req, res) {
    // handle a post request - result of accepting/rejecting a user league
    let decision = req.body.decision;
    let user = models.User.findOne({
      where: { id: req.body.organiser },
      attributes: ['id', 'email'],
      raw: true
    });
    var process, email;
    if (decision == 'A') {

      process = models.League.update({
        pending: 0
      }, {
        where: { 'id': req.body.league }
      });

    } else if (decision == 'R') {

      process = models.League.destroy({
        where: { id: req.body.league }
      })

    } else {
      res.send('Couldn\'t Process');
    }
    models.sequelize.Promise.join(
      user,
      process,
      function(user, process) {
        // send some emails
        req.flash('info', 'Processed');
        res.redirect('/leagues');
      }
    )
    
  }],

  get_id_pending: [utils.isAjax, function(req, res, id) {
    // list all pending reequests for a given league
    var league = models.League.findById(id, {
      include: {
        model: models.User,
        attributes: ['id', 'username']
      },
    });
    var users = models.League_User.findAll({
      where: [{ confirmed: 0 }, { league_id: id }],
      attributes: ['id'],
      include: {
        model: models.User,
        attributes: ['id', 'username']
      }
    });
    models.sequelize.Promise.join(
      league,
      users,
      function(league, users) {   
        if ((req.user && (req.user.id == league.organiser || req.user.admin)) || cfg.allowCurlAdmin) {
          res.send(users);
        } else {
          res.sendStatus(403);
        }
      }
    );
  }],

  post_id_pending: function(req, res) {
    // handle accepting/rejecting a user in a user league
  }

}