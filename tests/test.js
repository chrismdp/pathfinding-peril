
module.exports = {
  'Viewing the map' : function (browser) {
    browser
      .url('http://localhost:3000/')
      .waitForElementVisible('body', 1000)
      .assert.elementPresent('#map')
  },
  'Adding a player' : function (browser) {
    var request = require('request');
    request({
      url: "http://localhost:3000/players.json",
      method: "POST",
      json: {"name": "Player One", "webhook": "http://localhost:3000/loopback/always-s" },
    });

    browser
      .url('http://localhost:3000/')
      .waitForElementVisible('body', 1000)
      .assert.containsText('body', 'Pathfinding Peril')
      .assert.containsText('#players', 'Player One');
  },
};
