/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('league_user', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER(11),
      allowNull: false
    },
    league_id: {
      type: DataTypes.INTEGER(11),
      allowNull: false
    },
    pending: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    }
  }, {
    tableName: 'league_user',
    freezeTableName: true
  });
};
