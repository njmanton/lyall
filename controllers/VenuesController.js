'use strict';

var models  = require('../models'),
    Promise = require('bluebird'),
    _       = require('lodash'),
    chalk   = require('chalk'),
    folder  = 'venues';

module.exports = {

  get_index: function(req, res) {
    models.Venue.findAll({
      attributes: ['id', 'stadium', 'city', 'capacity', 'image'],
      raw: true
    }).then(function(venues) {
      res.render(folder + '/index', {
        title: 'Goalmine | Venues',
        venues: venues
      })
    })
  },

  get_id: function(req, res, id) {
    // get the venue details
    var venue = models.Venue.findById(id, {
      raw: true
    });
    var matches = models.Match.findAll({
      where: { venue_id: id },
      attributes: [
        'id', 
        'result', 
        [models.sequelize.fn('date_format', models.sequelize.col('date'), '%Y-%m-%d'), 'date'],
        'group', 
        'stage'
      ],
      include: [{
        model: models.Team,
        as: 'TeamA',
        attributes: ['id', 'name', 'sname']
      }, {
        model: models.Team,
        as: 'TeamB',
        attributes: ['id', 'name', 'sname']
      }, {
        model: models.Venue,
        attributes: ['id', 'stadium', 'city']
      }]
    });
    Promise.join(
      venue,
      matches,
      function(venue, matches) {
        if (venue) {
          venue.capacity = venue.capacity.toLocaleString();
          var games = [];
          // transform array
          for (var x = 0; x < matches.length; x++) {
            var m = matches[x];
            if (m.score == null && m.stage != 'G') {
              var placeholders = m.group.split('v');
            }
            games.push({
              id: m.id,
              result: m.result || '-',
              date: m.date,
              stage: m.stage,
              group: m.group,
              teama: {
                id: (m.TeamA) ? m.TeamA.id : 0,
                name: (m.TeamA) ? m.TeamA.name : placeholders[0],
                flag: (m.TeamA) ? m.TeamA.sname : ''
              },
              teamb: {
                id: (m.TeamB) ? m.TeamB.id : 0,
                name: (m.TeamB) ? m.TeamB.name : placeholders[1],
                flag: (m.TeamB) ? m.TeamB.sname : ''
              },
              venue: {
                id: m.venue.id,
                stadium: m.venue.stadium,
                city: m.venue.city
              }
            })
          }
          res.render(folder + '/view', {
            title: 'Goalmine | ' + venue.stadium,
            venue: venue,
            matches: games
          })
        } else {
          res.sendStatus(404);
        }
      }
    )
  }
}