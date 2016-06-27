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


var next_player_id = 0;

var Player = function(id, name, url, start) {
  return {
    id: next_player_id++,
    name: name,
    color: "hsl("+ ((next_player_id * 63) % 360) + ", 50%, 50%)",
    url: url,
    killer: false,
    location: start,
    image: "/images/hero.png",
  }
};

//var template = [
  //"XXXXXXXX",
  //"X@.....X",
  //"XXXX.XXX",
  //"X<X....X",
  //"X.X.XX.X",
  //"X.XXX..X",
  //"X......X",
  //"XXXXXXXX",
//];

var template = [
  "XXXXXXXXXXXXXXXXXXXX",
  "X............X.....X",
  "X.<.XX.......X@XX..X",
  "X....XX..XXX.X.XXX.X",
  "X.....X...MX.X.....X",
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
    } else if (tile == "@") {
      map.start = map.squares.length;
      map.squares.push({ id: map.squares.length, passable: true, image: 'stairs.png', x: j, y: i});
    } else if (tile == "M") {
      var minotaur_start = map.squares.length;
      map.squares.push({ id: minotaur_start, passable: true, image: 'floor.jpg', x: j, y: i});
      players.push({
        id: next_player_id++,
        name: 'Minotaur',
        url: 'http://localhost:3000/minotaur',
        location: minotaur_start,
        killer: true,
        image: '/images/minotaur.gif',
      });
    } else if (tile == "<") {
      map.finish = map.squares.length;
      map.squares.push({ id: map.squares.length, passable: true, image: 'target.jpg', x: j, y: i});
    }
  }
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
  try {
    request({
      url: player.url,
      method: "POST",
      timeout: 10000,
      json: {player: player, other_players: players, map: map},
    },
    function(err, r, body) {
      console.log("-----> " + player.name + " POST " + player.url + ": " + (err ? err : r.statusCode));
      if (!err && r.statusCode == 200) {
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
  } catch(e) { console.log("-----> EXPECTION! "+e); }
}

function kill_players_in_death_locations(players, death_locations) {
  var dead_players = [];
  for (var i = 0; i < players.length;) {
    var player = players[i];
    if (!player.killer) {
      if (death_locations.indexOf(player.location) != -1) {
        dead_players.push(player);
        players[i] = players[players.length - 1];
        players.pop();
        continue;
      }
    }
    i++;
  }
  return dead_players;
}

function collect_death_locations(players) {
  var result = [];
  for (var i = 0; i < players.length; i++) {
    var player = players[i];
    if (player.killer) {
      result.push(player.location);
    }
  }
  return result;
}

function non_killer_in_maze(players) {
  var result = false;
  for (var i = 0; i < players.length; i++) {
    var player = players[i];
    if (!player.killer) {
      result = true;
      break;
    }
  }
  return result;
}

var TICK_DURATION = 2000;

var tick = function() {
  console.log("-----> TICK");
  var death_locations = collect_death_locations(players);
  var dead_players = kill_players_in_death_locations(players, death_locations);

  for (var i = 0; i < dead_players.length; i++) {
    pusher.trigger('game', 'player_killed', { player: dead_players[i] });
  }

  if (non_killer_in_maze(players)) {
    for (var i = 0; i < players.length; i++) {
      var player = players[i];
      if (!player.finished) {
        if (!player.killer && player.location == map.finish) {
          pusher.trigger('game', 'winner', {player: player});
          player.finished = true;
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
  var sample = new Player(players.length, "Example name", "http://192.168.0.2/move", map.start);
    res.send({player: sample, other_players: [sample], map: map});
});

router.post('/players.json', function(req, res, next) {
  if (req.body.name && req.body.webhook) {
    var player = new Player(players.length, req.body.name, req.body.webhook, map.start);
    players.push(player);
    pusher.trigger('game', 'new_player', { player: player });
    res.send(req.body.name + ' JOINED - ' + req.body.webhook);
  } else {
    res.send("ERROR - cannot find name or webhook in request body")
  }
});

router.post('/loopback/always-s', function(req, res, next) {
  res.send("E");
});

router.post('/minotaur', function(req, res, next) {
  var possible = ["N", "S", "E", "W"];
  var direction = possible[Math.floor(Math.random() * possible.length)];
  res.send(direction);
});

module.exports = router;
