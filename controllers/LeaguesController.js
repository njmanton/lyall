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
          res.status(404).render('errors/404');
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
    // post format { name: <league name>, description: <description>, public: <public> }
    models.League.create({

      name: req.body.name,
      description: req.body.description,
      public: req.body.public || 0,
      organiser: (req.user) ? req.user.id : 1

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
        pending: !league.public
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
    // handle decision on accepting/rejecting a user league
    // post format { lid: <league id>, decision: <A|R> }
    let decision = req.body.decision;
    models.League.findOne({
      where: [{ pending: 1 }, { id: req.body.lid }],
      include: {
        model: models.User,
        attributes: ['id', 'username', 'email']
      }
    }).then(function(league) {
      if (league) {
        let template,
            subject = 'Goalmine User League Request',
            context = {
              user: league.user.username,
              league: league.name,
              id: league.id
            };
        if (decision == 'A') {
          template = 'league_create_accept';
          let create = models.League_User.create({
            user_id: league.user.id,
            league_id: league.id,
            pending: 0
          });
          let upd = league.update({ pending: 0 });
          models.sequelize.Promise.all([create, upd]).then(function(p) {
            //mail.send(league.user.email, false, subject, template, context, function(done) { })
            res.send(!!p);
          })
        } else if (decision == 'R') {
          template = 'league_create_reject';
          league.destroy().then(function(d) {
            //mail.send(league.user.email, false, subject, template, context, function(done) { })
            res.send(!!d);
          });
        }
      } else {
        res.sendStatus(404);
      }
    });
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
      where: [{ pending: 1 }, { league_id: id }],
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

  post_id_pending: [utils.isAuthenticated, utils.isAjax, function(req, res, id) {
    // handle accepting/rejecting a user in a user league
    // post format { uid: <invitee id>, decision: <A|R> }
    let decision = req.body.decision;
    models.League_User.findOne({
      attributes: ['id', 'league_id'],
      where: [{ user_id: req.body.uid }, { league_id: id }, { pending: 1 }],
      include: [{
        model: models.League,
        attributes: ['id', 'name']
      }, {
        model: models.User,
        attributes: ['username']
      }]
    }).then(function(lu) {
      if (lu) {
        let template;
        let subject = 'Goalmine User League Request',
            context = {
              user: lu.user.username,
              league: lu.league.name,
              id: lu.league_id
            };
        if (decision == 'A') {
          template = 'league_join_accept';
          lu.update({ pending: 0 }).then(function() {
            //mail.send()
            res.send(true);
          });
        } else if (decision == 'R') {
          template = 'league_join_reject';
          lu.destroy().then(function() {
            //mail.send()
            res.send(true);
          });
        }
      } else {
        res.sendStatus(404);
      }
    })
  }]
}