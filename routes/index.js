var express = require('express');
var router = express.Router();

var players = [];


var map = {
  squares: [],
  exits: {},
};

var template = [
  "XXXXXXXXXXXXXXXXXXXX",
  "X............X.....X",
  "X.S.XX.......XFXX..X",
  "X....XX..XXX.X.XXX.X",
  "X.....X....X.X.....X",
  "X.....X..XXX.XXX.X.X",
  "X...XXX......X.....X",
  "X...X...XXXX..MXXX.X",
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
      map.squares.push({ passable: false, image: 'wall.jpg', x: j, y: i});
    } else if (tile == ".") {
      map.squares.push({ passable: true, image: 'floor.jpg', x: j, y: i});
    } else if (tile == "S") {
      map.start = map.squares.length;
      map.squares.push({ passable: true, image: 'stairs.png', x: j, y: i});
    } else if (tile == "M") {
      map.minotaur_start = map.squares.length;
      map.squares.push({ passable: true, image: 'floor.jpg', x: j, y: i});
    } else if (tile == "F") {
      map.squares.push({ passable: false, image: 'target.jpg', x: j, y: i});
    }
  }
}

players.push({
  name: 'Minotaur',
  url: 'http://localhost:3000/minotaur',
  location: map.minotaur_start,
  image: '/images/minotaur.gif',
});

var find_square = function(map, x, y) {
  for (var i = 0; i < map.squares.length; i++) {
    var square = map.squares[i];
    if (square.x == x && square.y == y) {
      return i;
    }
  }
  return -1;
};

var collect_exits = function(map, i, direction, x, y) {
  var dest = find_square(map, x, y);
  if (dest != -1 && map.squares[dest].passable) {
    if (!map.exits[i]) {
      map.exits[i] = {};
    }
    map.exits[i][direction] = dest;
  }
}

for (var i = 0; i < map.squares.length; i++) {
  var square = map.squares[i];
  if (square.passable) {
    collect_exits(map, i, "W", square.x - 1, square.y);
    collect_exits(map, i, "E", square.x + 1, square.y);
    collect_exits(map, i, "N", square.x, square.y - 1);
    collect_exits(map, i, "S", square.x, square.y + 1);
  }
}

var request = require('request');

var get_command_from = function(map, player) {
  request({
    url: player.url,
    method: "POST",
    json: {map: map},
  },
  function(err, r, body) {
    if (!err && r.statusCode == 200) {
      console.log("DOING " + player.url + " AND GOT " + body);
      var command = body;
      if ("NSEW".includes(command)) {
        var exits = map.exits[player.location];
        console.log("EXITS from " + player.location);
        console.log(exits);
        if (exits[command]) {
          player.location = exits[command];
        }
      }
    }
  });
}

var tick = function() {
  for (var i = 0; i < players.length; i++) {
    var player = players[i];
    get_command_from(map, player);
  }

  setTimeout(tick, 1000);
}

setTimeout(tick, 1000);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Pathfinding Peril', players: players, map: map });
});

router.get('/index.json', function(req, res, next) {
  res.send({ map: map, players: players });
});

var colors = [
  'Red',
  'Green',
  'Blue',
  'Lime',
  'Cyan',
  'Purple',
  'Yellow',
  'Orange',
  'FireBrick',
  'Salmon',
  'HotPink'
];

router.post('/players.json', function(req, res, next) {
  players.push({
    name: req.body.name,
    color: colors[players.length],
    url: req.body.webhook,
    location: map.start,
    image: "/images/hero.png",
  });
  res.redirect('/index.json');
});

router.post('/loopback/always-s', function(req, res, next) {
  res.send("S")
});

router.post('/minotaur', function(req, res, next) {
  var possible = ["N", "S", "E", "W"];
  var direction = possible[Math.floor(Math.random() * possible.length)];
  res.send(direction);
});

module.exports = router;
