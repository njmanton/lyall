// jshint node: true, esversion: 6
'use strict';

var models    = require('./models'),
    mail      = require('./mail'),
    utils     = require('./utils'),
    chalk     = require('chalk'),
    passport  = require('passport');

// routes.js
// all non-model based routes

module.exports = function(app) {

  app.get('/mail', function(req, res) {
    //mail.getList('players@lcssl.org');
    res.send('done');
  });

  // home page
  app.get('/', function(req, res) {
    res.render('main', {
      title: 'Welcome'
    });
  });

  app.get('/home', utils.isAuthenticated, function(req, res) {
    models.Pred.findAll({
      where: { user_id: req.user.id },
      raw: true,
      include: {
        model: models.Match,
        attributes: ['id', 'date', 'result', 'group'],
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
    }).then(function(preds) {
      res.render('players/view', {
        title: 'Goalmine | ' + req.user.username,
        data: req.user,
        preds: preds,
        home: true
      }); 
    });
  });

  app.get('/flash', function(req, res){
    // Set a flash message by passing the key, followed by the value, to req.flash(). 
    req.flash('info', 'Flash is back!');
    res.redirect('/');
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
      failureRedirect: '/login',
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
      failureRedirect: '/login'
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
      failureRedirect: '/login',
      failureFlash: true
    })
  );

  app.get('/logout', function(req, res) {
    req.logout();
    req.flash('info', 'Logged Off');
    res.redirect('/');
  });

  // about page
  app.get('/about', function(req, res) {
    res.render('pages/about', {
      title: 'About Euro Goalmine'
    });
  });

  // any other static content
  app.get('/pages/:page', function(req, res) {
    res.render('pages/' + req.params.page, {
      title: req.params.page
    });
  });

};