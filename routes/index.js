var express = require('express');
var router = express.Router();
var Pusher = require('pusher');

var pusher = new Pusher({
  appId: '219212',
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: 'eu',
  encrypted: true
});

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
      map.squares.push({ id: map.squares.length, passable: false, image: 'wall.jpg', x: j, y: i});
    } else if (tile == ".") {
      map.squares.push({ id: map.squares.length, passable: true, image: 'floor.jpg', x: j, y: i});
    } else if (tile == "S") {
      map.start = map.squares.length;
      map.squares.push({ id: map.squares.length, passable: true, image: 'stairs.png', x: j, y: i});
    } else if (tile == "M") {
      map.minotaur_start = map.squares.length;
      map.squares.push({ id: map.squares.length, passable: true, image: 'floor.jpg', x: j, y: i});
    } else if (tile == "F") {
      map.finish = map.squares.length;
      map.squares.push({ id: map.squares.length, passable: true, image: 'target.jpg', x: j, y: i});
    }
  }
}

var MINOTAUR_COUNT = 1;

for (var i = 0; i < MINOTAUR_COUNT; i++) {
  players.push({
    id: i,
    name: 'Minotaur',
    url: 'http://localhost:3000/minotaur',
    location: map.minotaur_start,
    killer: true,
    tick_delay: 0,
    image: '/images/minotaur.gif',
  });
}

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

var push_location = function(player, command) {
  var data = {
    id: player.id,
    location: player.location,
    command: command,
  };
  pusher.trigger('game', 'move', data);
}

var request = require('request');

var get_command_from = function(map, player) {
  request({
    url: player.url,
    method: "POST",
    json: {player: JSON.stringify(player), other_players: JSON.stringify(players), map: JSON.stringify(map)},
  },
  function(err, r, body) {
    if (!err && r.statusCode == 200) {
      console.log("DOING " + player.url + " AND GOT " + body);
      var command = body;
      if ("NSEW".includes(command)) {
        var exits = map.exits[player.location];
        if (exits[command]) {
          player.location = exits[command];
          push_location(player, command);
        }
      }
    }
  });
}

var TICK_DURATION = 2000;

var tick = function() {
  var real_player = false;
  for (var j = 0; j < players.length; j++) {
    var killer = players[j];
    if (killer.killer) {
      for (var i = 0; i < players.length; i++) {
        var player = players[i];
        if (!player.killer) {
          if (player.location == players[0].location) {
            player.location = map.start;
            push_location(player, "DEAD");
            player.tick_delay = 30000;
          }
        }
      }
    } else {
      real_player = true;
    }
  }

  if (real_player) {
    for (var i = 0; i < players.length; i++) {
      var player = players[i];
      if (!player.finished) {
        if (player.location == map.finish) {
          pusher.trigger('game', 'winner', {player: player});
          player.finished = true;
        } else if (players[i].tick_delay > 0) {
          players[i].tick_delay -= TICK_DURATION;
          push_location(player, player.tick_delay / 1000);
        } else {
          get_command_from(map, player);
        }
      }
    }
  }

  setTimeout(tick, TICK_DURATION);
}

setTimeout(tick, TICK_DURATION);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Pathfinding Peril', players: players, map: map });
});

router.get('/rules', function(req, res, next) {
  res.render('rules', { title: 'Pathfinding Peril - Rules' });
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
  var player = {
    id: players.length,
    name: req.body.name,
    color: colors[players.length],
    url: req.body.webhook,
    killer: false,
    tick_delay: 0,
    location: map.start,
    image: "/images/hero.png",
  };
  players.push(player);
  pusher.trigger('game', 'new_player', { player: player });
  res.redirect('/index.json');
});

router.post('/loopback/always-s', function(req, res, next) {
  res.send("S");
});

router.post('/minotaur', function(req, res, next) {
  var possible = ["N", "S", "E", "W"];
  var direction = possible[Math.floor(Math.random() * possible.length)];
  res.send(direction);
});

module.exports = router;
