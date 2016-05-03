/******************************************************************************
server.js

main entry point for app

******************************************************************************/

// jshint node: true, esversion: 6
'use strict';

var express         = require('express'),
    app             = express(),
    pkg             = require('./package.json'),
    bp              = require('body-parser'),
    expressSession  = require('express-session'),
    excon           = require('express-controller'),
    flash           = require('connect-flash'),
    router          = express.Router(),
    models          = require('./models'),
    bars            = require('express-handlebars');

// handlebars as templating engine
var hbs = bars.create({
  defaultLayout: 'layout',
  extname: '.hbs',
  helpers: {
    groupPrefix: (data) => {
      var pre = (~['A', 'B', 'C', 'D', 'E', 'F'].indexOf(data)) ? 'Group ' : '';
      return pre + data;      
    }
  }
});

app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');

// set static route
app.use(express.static('assets'));

// body-parsing for post requests
app.use(bp.urlencoded({ 'extended': false }));
app.use(bp.json());

app.set('port', process.env.PORT || 1980); // a good year for lyall

// middleware
app.use(expressSession({
  secret: 'dfTJds36wfkw',
  resave: false,
  saveUninitialized: false
}));
app.use(flash());
app.use((req, res, next) => {
  res.locals.flash_success = req.flash('success');
  res.locals.flash_error = req.flash('error');
  res.locals.flash_info = req.flash('info');
  next();
});

// authentication using passport.js
require('./auth')(app);

// add routing
app.use(router);
require('./routes')(app);
excon.setDirectory(__dirname + '/controllers').bind(router);

// final middleware to handle anything not matched by a route
app.use(function(req, res) {
  res.status(400).render('errors/404', {
    title: 'Uh-oh!'
  });
});

// set up sequelize and start server listening
models.sequelize.sync().then(function() {
  console.log('Sequelize initialised');
  const server = app.listen(app.get('port'), () => {
    console.log(pkg.name, 'running on port', server.address().port);
  });
});
