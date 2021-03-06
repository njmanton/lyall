// jshint node: true, esversion: 6
'use strict';

var models = require('../models'),
    moment = require('moment'),
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
    var tab = models.Team.table(models, id);
    var matches = models.Match.findAll({
          where: { $or: [{ teama_id: id }, { teamb_id: id }] },
          order: 'stageorder DESC, date ASC',
          attributes: [
            'id', 
            'result', 
            'date',
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
      tab,
      matches,
      function(team, tab, matches) {
        if (team) {
          tab.map(t => {
            t.gd = ((t.gd > 0 ? '+' : '') + t.gd);
            t.sel = (t.id == team.id);
          });

          var games = [];
          for (var x = 0; x < matches.length; x++) {
            var m = matches[x],
                result = null,
                home = (m.TeamA && m.TeamA.id == id);

            if (m.result) {
              result = (home) ? m.result : m.result.split('-').reverse().join('-');
            }

            var oppo = {};
            if (home) {
              oppo = (m.TeamB) ? { id: m.TeamB.id, name: m.TeamB.name, flag: m.TeamB.sname } : { id: null, name: m.group.split('v')[1]};
            } else {
              oppo = (m.TeamA) ? { id: m.TeamA.id, name: m.TeamA.name, flag: m.TeamA.sname } : { id: null, name: m.group.split('v')[0]};
            }

            games.push({
              id: m.id,
              date: moment(m.date).format('DD MMM, HH:mm'),
              group: m.group,
              stage: m.stage,
              opponent: oppo,
              result: result || '-',
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
            table: tab,
            matches: ga(games, 'stage')
          });
        } else {
          res.status(404).render('errors/404');
        }
      }
    );
  }
};