var express = require('express');
var router = express.Router();

var players = [];
var map = [];

var template = [
  "XXXXXXXXXXXXXXXXXXXX",
  "X............X.....X",
  "X...XX.......XFXX..X",
  "X....XX..XXX.X.XXX.X",
  "X.....X....X.X.....X",
  "X.....X..XXX.XXX.X.X",
  "X...XXX......X.....X",
  "X...X...XXXX...XXX.X",
  "X.....XXX..X.X.X...X",
  "X.....X....X.......X",
  "X........XXX..XXXXXX",
  "X..................X",
  "XXXXXXXXXXXXXXXXXXXX",
];

for (var i = 0; i < template.length; i++) {
  var row = template[i];
  for (var j = 0; j < row.length; j++) {
    var tile = row[j];
    if (tile == "X") {
      map.push({ image: 'wall', x: j, y: i });
    } else if (tile == ".") {
      map.push({ image: 'floor', x: j, y: i });
    } else if (tile == "F") {
      map.push({ image: 'target', x: j, y: i });
    }
  }
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Pathfinding Peril', players: players, map: map });
});

router.get('/index.json', function(req, res, next) {
  res.send({ players: players });
});

router.post('/players.json', function(req, res, next) {
  players.push(req.body.name);
  res.redirect('/index.json');
});


module.exports = router;
