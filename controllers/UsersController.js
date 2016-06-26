// jshint node: true, esversion: 6
'use strict';

var folder    = 'players',
    models    = require('../models'),
    bCrypt    = require('bcrypt-nodejs'),
    passport  = require('passport'),
    chalk     = require('chalk'),
    utils     = require('../utils'),
    moment    = require('moment'),
    mail      = require('../mail');

module.exports = {

  get_index: function(req, res) {
    models.User.table(models).then(function(preds) {
      let uid = (req.user) ? req.user.id : null;
      preds.map(p => p.sel = (p.id == uid));
      res.render(folder + '/index', {
        title: 'Leaderboard',
        table: preds
      });
    });
  },

  get_id: function(req, res, id) {
    var user = models.User.findOne({
      where: [{ validated: 1 }, { id: id }]
    });
    var preds = models.Pred.findAll({
      where: { user_id: id },
      //raw: true,
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
    });
    models.sequelize.Promise.join(
      user,
      preds,
      function(user, preds) {
        preds.map(p => {
          let then = moment(p.match.date).startOf('day').add(12, 'h');
          p.expired = (moment().isAfter(then) || (p.match.id < 37 ));
        })
        if (user) {
          res.render(folder + '/view', {
            title: 'Goalmine | ' + user.username,
            data: user,
            preds: preds
          });           
        } else {
          res.status(404).render('errors/404');
        }
       
      }
    );
  },

  get_id_leagues: [utils.isAjax, function(req, res, id) {
    // send a list of leagues of which the user is a member
    models.League_User.findAll({
      attributes: ['id', 'pending'],
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
    });
  }],

  get_update: [utils.isAuthenticated, function(req, res) {
    res.render(folder + '/update', {
      title: 'Update details'
    });
  }],

  get_invite: [utils.isAuthenticated, function(req, res) {
    // requires loged in user
    let inviter = req.user ? req.user.id : 0;
    models.User.findAll({
      where: { referredby: inviter },
      raw: true,
      attributes: ['email', 'validated', 'username', 'id']
    }).then(invitees => {
      res.render(folder + '/invite', {
        title: 'Invite a friend',
        list: invitees
      });
    })

  }],

  post_invite: [utils.isAuthenticated, function(req, res) {
    // validate form fields
    // post format { email: <invitee email>, message: <message to send>, copy: <add inviter to cc>}
    models.User.invite(req.body, req.user).then(response => {
      req.flash('info', 'invitation to ' + req.body.email + ' sent');
      res.redirect('/home');
      console.log(response);
    });
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
        req.flash('error', 'Sorry, that activation code (' + id + ') was not recognised. Please check and try again');
        res.redirect('/');
      } else {
        res.render(folder + '/confirm', {
          title: 'Goalmine | Confirm Account',
          data: user
        });         
      }
    });
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
        req.flash('success', 'Thank you, your account is now verified');
        res.redirect('/login');
      } else {
        req.flash('error', 'There was a problem confirming that user account.');
        res.redirect('/users/confirm/' + req.body.code);
      }
    }).catch(function(err) {
      console.log('confirm_error', err);
    });
  },

  get_available_username: [utils.isAjax, function(req, res, username) {
    // checks whether typed username in users/confirm is available
    models.User.findOne({
      where: { username: username }
    }).then(function(found) {
      res.send(found === null);
    });
  }],

  get_forgot: [utils.isAnon, function(req, res) {
    // requires anon user
    res.render(folder + '/forgot');
  }],

  get_payment: [utils.isAdmin, function(req, res) {
    models.User.findAll({
      attributes: ['id', 'username', 'paid'],
      where: { validated: 1 }
    }).then(function(users) {
      res.render(folder + '/payment', {
        title: 'Payments',
        users: users
      });
    });
  }],

  post_payment: [utils.isAdmin, utils.isAjax, function(req, res) {
    // post format { payee: <user id of payee> }
    models.User.update({
      paid: 1
    }, {
      where: { id: req.body.payee }
    }).then(rows => {
      // send an email to the user
      res.send(rows);
    });

    models.User.findById(req.body.payee).then(user => {
      user.update({ paid: 1}).then(rows => {
        let subject = 'Goalmine Payment Confirmation',
            template = 'payment_made.hbs',
            context = {
              user: user.username
            };
        mail.send(user.email, null, subject, template, context, mail_result => {
          res.send(mail_result);
        })
      })
    }).catch(e => { console.error(e); })
  }],

  post_forgot: function(req, res) {
    // validate form fields
    // if username and email exist, reset password
    // post format { username: <username>, email: <email> }
    models.User.findOne({
      where: [{ username: req.body.username }, { email: req.body.email }]
    }).then(user => {
      if (user) {
        var reset = utils.getTempName(8),
            now = moment().format('ddd DD MMM, HH:mm');
        user.resetpwd = reset;
        user.save().then(() => {
          var template = 'reset_request.hbs',
              cc = 'admin@euro.goalmine.eu',
              subject = 'Password reset request',
              context = {
                name: req.body.username,
                reset: reset,
                date: now
              };

          mail.send(req.body.email, cc, subject, template, context, function(mail_result) {
            
          })
        }).catch(function(e) {
          console.log('error', e);
        });
      }
      req.flash('info', 'Thank you. If those details were found, you will shortly receive an email explaining how to reset your password');
      res.redirect('/');
    });
    
  },

  get_missing: [utils.isAjax, function(req, res) {
    if (req.user) {
      models.User.missing(models, req.user.id).then(function(missing) {
        res.send(missing);
      });      
    } else {
      res.sendStatus(403);
    }

  }],

  get_reset_id: function(req, res, id) {
    models.User.findOne({
      where: { resetpwd: id },
      attributes: ['username', 'email']
    }).then(u => {
      if (!u) {
        req.flash('error', 'Sorry, I didn\'t recognise that code. Please try again');
        res.redirect('/');
      } else {
        res.render(folder + '/reset', {
          title: 'Goalmine | Reset Password',
          username: u.username 
        });
      }
    })
  },

  post_reset_id: function(req, res, id) {
    models.User.findOne({
      where: { resetpwd: id, email: req.body.email }
    }).then(user => {
      // check there's a user with that reset code and email, and don't rely on
      // javascript to enforce password complexity
      if (user && (req.body.pwd.length > 5) && (req.body.pwd == req.body.rpt)) {
        user.update({
          password: bCrypt.hashSync(req.body.rpt, bCrypt.genSaltSync(10), null),
          resetpwd: null
        }).then(r => {
          if (r) {
            req.flash('success', 'Your password has been updated. You can now log in');
          } else {
            req.flash('error', 'Sorry, unable to update that account');            
          }
          res.redirect('/');
        })        
      } else {
        req.flash('error', 'Sorry, those details were not valid');
        res.redirect('/');
      }
    })
    
  }

};
