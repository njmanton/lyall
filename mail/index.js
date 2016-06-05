// jshint node: true, esversion: 6
'use strict';

var config  = require('../config/mail_config'),
    hbs     = require('express-handlebars/node_modules/handlebars'),
    fs      = require('fs'),
    mailgun = require('mailgun-js')(config);

var mail = {

  send: function(recipient, cc, subject, template_file, context, done) {

    // convert template and context into message
    let template = fs.readFileSync(__dirname + '/templates/' + template_file, 'utf8'),
        message = hbs.compile(template);

    var data = {
      from: 'Euro Goalmine <euro.goalmine@lcssl.org>',
      to: recipient,
      subject: subject,
      text: message(context)
    };

    if (cc) {
      data.cc = cc;
    }

    mailgun.messages().send(data).then(function(response) {
      console.log('email sent', response); // move to winston
      done(response);
    }, function(err) {
      console.error('not sent', err); // move to winston
      done(err);
    });

  },

  getList: function(list, done) {

    mailgun.lists(list).members().list().then(function(data) {
      console.log('info', data);
    }, function(err) {
      console.log('err', err);
    });
  },

  addMember: function(list, email, name) {

    var user = {
      subscribed: true,
      address: email,
      name: name
    };

    mailgun.lists(list).members().create(user).then(function(data) {
      console.log('addMember', data);
    }, function(err) {
      console.log('addMember error', err);
    });

  }

};

module.exports = mail;