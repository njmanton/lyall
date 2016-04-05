'use strict';

var folder    = 'players',
    models    = require('../models'),
    bCrypt    = require('bcrypt-nodejs'),
    passport  = require('passport'),
    chalk     = require('chalk'),
    utils     = require('../utils'),
    mail      = require('../mail'),
    bp        = require('body-parser');

module.exports = {

  get_index: function(req, res) {
    models.User.table(models).then(function(preds) {
      console.log(preds);
      res.render(folder + '/index', {
        title: 'Leaderboard',
        table: preds
      });
    })
    
  },

  get_id: function(req, res, id) {
    var user = models.User.findById(id);
    var preds = models.Pred.findAll({
      where: { user_id: id },
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
    });
    models.sequelize.Promise.join(
      user,
      preds,
      function(user, preds) {
        if (user) {
          res.render(folder + '/view', {
            title: 'Goalmine | ' + user.username,
            data: user,
            preds: preds
          })           
        } else {
          res.sendStatus(404);
        }
       
      }
    )
  },

  get_id_leagues: [utils.isAjax, function(req, res, id) {
    // send a list of leagues of which the user is a member
    models.League_User.findAll({
      attributes: ['id', 'confirmed'],
      raw: true,
      where: { user_id: id },
      include: {
        model: models.League,
        attributes: ['id', 'name', 'public', 'pending']
      }
    }).then(function(leagues) {
      if (leagues) {
        res.send(leagues);
      } else {
        res.send(null);
      }
    })
  }],

  get_invite: [utils.isAuthenticated, function(req, res) {
    // requires loged in user
    res.render(folder + '/invite', {
      title: 'Invite a friend'
    });
  }],

  post_invite: [utils.isAuthenticated, function(req, res) {
    // validate form fields
    // post format { email: <invitee email>, message: <message to send>, copy: <add inviter to cc>}
    models.User.invite(req.body, req.user).then(function(response) {
      res.send(response);
    })
  }],

  get_confirm_id: [utils.isAnon, function(req, res, id) {
    models.User.findOne({
      where: { username: id },
      raw: true,
      include: {
        model: models.User,
        as: 'Referrer',
        attributes: ['id', 'username', 'email']
      }
    }).then(function(user) {
      if (!user) {
        req.flash('message', 'Account not found');
        res.redirect('/');
      } else {
        res.render(folder + '/confirm', {
          title: 'Goalmine | Confirm Account',
          data: user
        });         
      }
    })
  }],

  post_confirm: function(req, res) {
    // process new user
    // TODO validation
    // post format { username: <requested username>, email: <email>, password: <password>, repeat: <password again>, code: <validation code> }
    models.User.update({
      username: req.body.username,
      password: bCrypt.hashSync(req.body.password, bCrypt.genSaltSync(10), null),
      validated: 1,
      email: req.body.email
    }, {
      where: { username: req.body.code }
    }).then(function(user) {
      if (user) {
        req.flash('success', 'Thank you, you account is now verified');
        res.redirect('/login');
      } else {
        req.flash('error', 'There was a problem confirming that user account.')
      }
    }).catch(function(err) {
      console.log('confirm_error', err);
    })
  },

  get_available_username: [utils.isAjax, function(req, res, username) {
    // checks whether typed username in users/confirm is available
    models.User.findOne({
      where: { username: username }
    }).then(function(found) {
      res.send(found == null);
    })
  }],

  get_forgot: [utils.isAnon, function(req, res) {
    // requires anon user
    res.render(folder + '/forgot');
  }],

  get_payment: [utils.isAdmin, utils.isAjax, function(req, res) {
    models.User.findAll({
      attributes: ['id', 'username', 'paid'],
      where: { validated: 1 }
    }).then(function(users) {
      res.send(users);
    })
  }],

  post_payment: [utils.isAdmin, utils.isAjax, function(req, res) {
    // post format { payee: <user id of payee> }
    models.User.update({
      paid: 1
    }, {
      where: { id: req.body.payee }
    }).then(function(rows) {
      res.send(rows);
    })
  }],

  post_forgot: function(req, res) {
    // validate form fields
    // if username and email exist, reset password
    // post format { username: <username>, email: <email> }
    models.User.findOne({
      where: [{ username: req.body.username }, { email: req.body.email }]
    }).then(function(user) {
      if (user) {
        var reset = utils.getTempName(8);
        user.resetpwd = reset;
        user.save().then(function() {
          var template = '',
              cc = 'admin@euro.goalmine.eu',
              subject = 'Password reset request',
              context = {
                name: req.body.username,
                reset: reset
              };

          //mail.send(req.body.email, cc, subject, template, context, function(mail_result) {
            
          //})
        }).catch(function(e) {
          console.log('error', e);
        });
      }
      req.flash('info', 'If those details were found, you will shortly receive an email explaining how to reset your password');
      res.redirect('/');
    })
    
  }

}