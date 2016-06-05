// jshint node: true, esversion: 6
'use strict';

var models              = require('../models'),
    bCrypt              = require('bcrypt-nodejs'),
    chalk               = require('chalk'),
    passport            = require('passport'),
    configAuth          = require('../config/auth_config'),
    LocalStrategy       = require('passport-local').Strategy,
    FacebookStrategy    = require('passport-facebook').Strategy,
    GoogleStrategy      = require('passport-google-oauth').OAuth2Strategy;

module.exports.createHash = function(password){
  return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};

module.exports = function(app) {

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use('local', new LocalStrategy({ passReqToCallback: true },
    function(req, username, password, done) {
      models.User.findOne({
        where: { username: username }
      }).then(function(user) {
        if (!user) {
          console.log('user not found');
          return done(null, false, { message: 'user not found' });
        }
        try {
          if (!bCrypt.compareSync(password, user.password)) {
            console.log('wrong password');
            return done(null, false, { message: 'incorrect password' });
          }
        } catch(e) {
          console.log(e);
          return done(null, false, { message: 'problem with password' });
        }
        user.update({ resetpwd: null }); // nullify reset code, if present
        req.flash('success', 'logged in');
        if (!user.paid) {
          req.flash('error', 'You have not yet paid your entry fee');
        }
        return done(null, user);

      }).error(function(err) {
        console.log('e', err);
        return done(err);
      });
    }
  ));

  passport.use(new FacebookStrategy({
    clientID          : configAuth.facebookAuth.clientID,
    clientSecret      : configAuth.facebookAuth.clientSecret,
    callbackURL       : configAuth.facebookAuth.callbackURL,
    passReqToCallback : true
  },
    function(req, token, refreshToken, profile, done) {
      process.nextTick(function() {
        if (req.user) {
          models.User.update({
            facebook_id: profile.id
          }, {
            where: { id: req.user.id }
          }).then(function(u) {
            if (u) {
              req.flash('info', 'Account now linked to your Facebook profile');
              return done(null, req.user);
            } else {
              req.flash('error', 'Couldn\'t link your profile');
              return done(null, req.user);
            }
          }).catch(function(e) {
            return done(e);
          });
        } else {
          // find the user in the database based on their facebook id
          models.User.findOne({
            where: { 'facebook_id': profile.id }
          }).then(function(user) {
            if (user) {
              req.flash('success', 'Logged in via Facebook');
              if (!user.paid) {
                req.flash('error', 'You have not yet paid your entry fee');
              }
              user.update({ resetpwd: null });
              return done(null, user);
            } else {
              req.flash('error', 'Can\'t find matching FB user');
              return done(null, false, { message: 'Can\'t find matching FB user' });
            }
          }).catch(function(e) {
            return done(e);
          });          
        }

      });
    }
  ));

  passport.use(new GoogleStrategy({
    clientID          : configAuth.googleAuth.clientID,
    clientSecret      : configAuth.googleAuth.clientSecret,
    callbackURL       : configAuth.googleAuth.callbackURL,
    passReqToCallback : true
  },
    function(req, token, refreshToken, profile, done) {
      process.nextTick(function() {
        if (req.user) {
          models.User.update({
            google_id: profile.id
          }, {
            where: { id: req.user.id }
          }).then(function(u) {
            if (u) {
              req.flash('info', 'Account now linked to your Google+ profile');
              return done(null, req.user);
            } else {
              req.flash('error', 'Couldn\'t link your profile');
              return done(null, req.user);
            }
          }).catch(function(e) {
            return done(e);
          });
        } else {
          // find the user in the database based on their google id
          models.User.findOne({
            where: { 'google_id': profile.id }
          }).then(function(user) {
            if (user) {
              user.update({ resetpwd: null });
              req.flash('success', 'Logged in via Google');
              if (!user.paid) {
                req.flash('error', 'You have not yet paid your entry fee');
              }
              return done(null, user);
            } else {
              return done(null, false, { message: 'Can\'t find matching Google+ user' });
            }
          }).catch(function(e) {
            return done(e);
          });          
        }

      });
    }
  ));


  // make user object available in handlebars views
  app.use(function (req, res, next) {
    if (!res.locals.user && req.user) {
      res.locals.user = req.user;
    }
    next();
  });

  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    models.User.findById(id).then(function(user) {
      done(null, user);
    });
  });

};

