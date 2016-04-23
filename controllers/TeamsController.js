// jshint node: true, esversion: 6
'use strict';

var models = require('../models'),
    ga     = require('group-array'),
    folder = 'teams';

module.exports = {

  get_index: function(req, res) {
    models.Team.findAll({
      attributes: ['id', 'name', 'group', 'sname', 'ranking', 'coach'],
      raw: true
    }).then(function(teams) {
      res.render(folder + '/index', {
        title: 'Goalmine | Teams',
        teams: teams
      });         
    });
  },

  get_id: function(req, res, id) {
    var team = models.Team.findById(id);
    var matches = models.Match.findAll({
      where: { $or: [{ teama_id: id }, { teamb_id: id }] },
      //raw: true,
      attributes: [
        'id', 
        'result', 
        [models.sequelize.fn('date_format', models.sequelize.col('date'), '%a, %e %b %H:%i'), 'date'],
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
    models.sequelize.Promise.join(
      team,
      matches,
      function(team, matches) {
        if (team) {
          var games = [];
          for (var x = 0; x < matches.length; x++) {
            var m = matches[x],
                result = null,
                home = (m.TeamA.id == id);

            if (m.result) {
              result = (home) ? m.result : m.result.split('-').reverse().join('-');
            }

            games.push({
              id: m.id,
              date: m.date,
              group: m.group,
              stage: m.stage,
              opponent: {
                id: (home) ? m.TeamB.id : m.TeamA.id,
                name: (home) ? m.TeamB.name : m.TeamA.name,
                flag: (home) ? m.TeamB.sname : m.TeamA.sname
              },
              result: result,
              venue: {
                id: m.venue.id,
                stadium: m.venue.stadium,
                city: m.venue.city
              }     
            });
          }
          res.render(folder + '/view', {
            title: `Goalmine | ${team.name}`,
            team: team,
            matches: ga(games, 'stage')
          });
        } else {
          res.status(404).render('errors/404');
        }
      }
    );
  }
};