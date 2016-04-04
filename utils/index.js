'use strict';

const cfg = require('../config/cfg.js');

const points = {
  win: 5,
  correct_difference: 3,
  correct_result: 1,
  joker_penalty: -1
}

var sgn = function(a) {
  
  if (a < 0) {
    return -1;
  } else if (a > 0) {
    return 1;
  } else if (a == 0) {
    return 0;
  } else {
    console.log('NaN');
    return NaN;
  }

}

var utils = {

  getTempName: function(len) {
    var code = '', 
      letters = '2346789ABCDEFGHJKLMNPQRTUVWXYZ'; 
  
    // generate a random code
    for (var i = 0; i < len; i++) {
      var idx = Math.floor(Math.random() * (letters.length - 1));
      code += letters[idx];
    }
    return code;
  },

  // access functions used in routes
  isAjax: function(req, res, next) {
    if (req.xhr || ~req.headers.accept.indexOf('json') || cfg.allowCurlAjax) {
      return next();
    } else {
      res.sendStatus(403);
    }
  },

  isAuthenticated: function (req, res, next) {
    if (req.isAuthenticated() || cfg.allowCurlAuth) {
      return next();
    }
    res.redirect('/login');
  },

  isAnon: function(req, res, next) {
    if (req.isAuthenticated() && !cfg.allowCurlAnon) {
      res.redirect('/users/' + req.user.id);
    }
    return next();
  },

  isAdmin: function(req, res, next) {
    if ((req.isAuthenticated() && req.user.admin == 1) || cfg.allowCurlAdmin) {
      return next();
    }
    if (req.isAuthenticated()) {
      res.redirect('/users/' + req.user.id);
    }
    res.redirect('/login');
  },

  calc: function(pred, result, joker) {
  
    var pg, rg, score = 0;

    pg = pred.split('-');
    if (result && pred) {
      rg = result.split('-');
      pg = pred.split('-');
    } else {
      return score;
    }

    if (pred == result) {
      score = points.win * (joker + 1);
    } else if ((pg[0] - rg[0]) == (pg[1] - rg[1])) {
      score = points.correct_difference * (joker + 1);
    } else if (sgn(pg[0] - pg[1]) == sgn(rg[0] - rg[1])) {
      score = points.correct_result * (joker + 1);
    } else {
      score = (joker * points.joker_penalty);
    }

    return score;

  }

}

module.exports = utils