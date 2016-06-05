// jshint node: true, esversion: 6
'use strict';

var Sequelize = require('sequelize'),
    conn      = require('../config/db_config'),
    sequelize = new Sequelize(conn.test, { logging: null }),
    db        = {};

db.Team        = sequelize.import('./teams.js');
db.User        = sequelize.import('./users.js');
db.Match       = sequelize.import('./matches.js');
db.Venue       = sequelize.import('./venues.js');
db.Pred        = sequelize.import('./predictions.js');
db.League      = sequelize.import('./leagues.js');
db.League_User = sequelize.import('./league_user.js');
db.Goal        = sequelize.import('./goals.js');
db.Tournament  = sequelize.import('./tournaments.js');

// associations

// league 1:n league_user
db.League.hasMany(db.League_User, { foreignKey: 'league_id' });
db.League_User.belongsTo(db.League, { foreignKey: 'league_id' });

// user 1:n league_user
db.User.hasMany(db.League_User, { foreignKey: 'user_id' });
db.League_User.belongsTo(db.User, { foreignKey: 'user_id' });

// user 1:n league
db.User.hasMany(db.League, { foreignKey: 'organiser' });
db.League.belongsTo(db.User, { foreignKey: 'organiser' });

// team[a] 1:n match
// team[b] 1:n match 
db.Team.hasMany(db.Match);
db.Match.belongsTo(db.Team, { as: 'TeamA', foreignKey: 'teama_id' });
db.Match.belongsTo(db.Team, { as: 'TeamB', foreignKey: 'teamb_id' });

// user 1:1 referrer(user)
db.User.hasOne(db.User, { as: 'Referrer', foreignKey: 'referredby' });
db.User.belongsTo(db.User, { as: 'Referrer', foreignKey: 'referredby' });

// venue 1:n match
db.Venue.hasMany(db.Match, { foreignKey: 'venue_id' });
db.Match.belongsTo(db.Venue, { foreignKey: 'venue_id' });

// user 1:n prediction
db.User.hasMany(db.Pred, { foreignKey: 'user_id' });
db.Pred.belongsTo(db.User, { foreignKey: 'user_id' });

// match 1:n prediction
db.Match.hasMany(db.Pred, { foreignKey: 'match_id' });
db.Pred.belongsTo(db.Match, { foreignKey: 'match_id' });

// match 1:n goal
db.Match.hasMany(db.Goal, { foreignKey: 'match_id' });
db.Goal.belongsTo(db.Match, { foreignKey: 'match_id' });

// team 1:n goal
db.Team.hasMany(db.Goal);
db.Goal.belongsTo(db.Team, { foreignKey: 'team_id' });

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
