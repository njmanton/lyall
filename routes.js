// jshint node: true, esversion: 6
'use strict';

var models    = require('./models'),
    moment    = require('moment'),
    mail      = require('./mail'),
    fs        = require('fs'),
    utils     = require('./utils'),
    chalk     = require('chalk'),
    passport  = require('passport');

// routes.js
// all non-model based routes

module.exports = function(app) {

  /*app.get('/mail', function(req, res) {
    mail.getList('players@lcssl.org');
    res.send('done');
  });*/

  // home page
  app.get('/', function(req, res) {
    res.render('main', {
      title: 'Welcome'
    });
  });

  app.get('/home', utils.isAuthenticated, function(req, res) {
    models.Pred.findAll({
      where: { user_id: req.user.id },
      include: {
        model: models.Match,
        attributes: ['id', 'date', 'result', 'group'],
        include: [{
          model: models.Team,
          as: 'TeamA',
          attributes: ['id', 'name', 'sname']
        }, {
          model: models.Team,
          as: 'TeamB',
          attributes: ['id', 'name', 'sname']
        }]
      }
    }).then(function(preds) {
      preds.map(p => {
        let then = moment(p.match.date).startOf('day').add(19, 'h');
        p.expired = (moment().isAfter(then) || (p.match.id < 37 ));
      })
      res.render('players/view', {
        title: 'Goalmine | ' + req.user.username,
        data: req.user,
        preds: preds,
        home: true
      }); 
    });
  });

  // login
  app.get('/login', utils.isAnon, function(req, res) {
    res.render('players/login', {
      title: 'Login'
    });
  });

  app.post('/login', 
    passport.authenticate('local', {
      successRedirect: '/home',
      failureRedirect: '/',
      failureFlash: true
    })
  );

  app.get('/auth/facebook', 
    passport.authenticate('facebook', {
      //scope: ['email', 'photo']
    })
  );

  app.get('/auth/facebook/callback', 
    passport.authenticate('facebook', {
      successRedirect: '/home',
      failureRedirect: '/'
    })
  );

  app.get('/auth/google', 
    passport.authenticate('google', {
      scope: ['profile']
    })
  );

  app.get('/auth/google/callback',
    passport.authenticate('google', {
      successRedirect: '/home',
      failureRedirect: '/',
      failureFlash: true
    })
  );

  app.get('/logout', function(req, res) {
    req.logout();
    req.flash('info', 'Logged Off');
    res.redirect('/');
  });

  // any other static content
  app.get('/pages/:page', function(req, res) {
    let path = `views/pages/${req.params.page}.hbs`;
    try {
      fs.accessSync(path, fs.F_OK);
      res.render('pages/' + req.params.page, {
        title: req.params.page
      });      
    } catch (e) {
      res.status(404).render('errors/404', { title: 'Uh-oh' });
    }
  });

};