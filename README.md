# Pathfinding peril

This is a simple game built using node.js, express.js and Pusher to allow people to write HTTP bots to navigate a maze. Try not to get eaten by the minotaur(s)!

## How to join in

To join in the game, you'll need to create a web service at a URL that's accessible from where the game server is running from.

To do this, post to `players.json` with the following JSON:

```
{
  "name":"<Your player name>"
  "webhook":"http://192.168.0.2:8080/move"
}
```

Replace the webhook with your server URL. If you're running on a local laptop, make sure you bind to the main network interface (0.0.0.0), _not_ `localhost` or it won't work! You can use any language that can run a web server and that can parse JSON.

When running, the game will call your webhook every few seconds to find out your next move. It will pass you JSON in the following format:

```
{
  "player": {
    "location":1
    ...
  },
  "other_players": {
    "location":1
    ...
  },
  "map": {
    "start":1,
    "finish":0,
    "squares": [
      { "id":0, "passable":"true", "image":"wall.jpg", "x":2, "y":2 },
      { "id":1, "passable":"true", "image":"wall.jpg", "x":3, "y":2 },
      ...
    ],
    "exits": {
      "0": { "E": 1 },
      "1": { "W": 0 },
      ...
    }
  }
}
```

From this, you should be able to build up a picture of the map, and implement a pathfinding algorithm to get you to the finish.

Your service has to return one of the following letters in the response: `N`, `S`, `E` or `W`. No other response will be accepted.

If your character dies, they head back to the start to respawn, and have to wait a certain amount of time before they can move again.

You can connect to the root of the server to see a live map of what's going on!

## How to run a server

The server is a normal node.js project. To run it:

  * Clone the repository.
  * Run the following commands:

    npm install
    npm start

**NOTE**: You will need to ensure the `PUSHER_KEY` and `PUSHER_SECRET` environment variables are set for your server process for the realtime updates via Pusher to work. You can create your own project at http://pusher.com).
