function add_new_player(player, square) {
  var div = $("<img/>").attr("src", player.image).
    attr("class", "tile player player-" + player.id).
    css("top", square.y * 20 + "px").
    css("left", square.x * 20 + "px").
    css("width", 20 +"px").
    css("height", 20 + "px").
    css("background-color", player.color);
  $("#map").append(div);

  var li = $("<li/>").
    html(player.name).
    attr("class", "player-" + player.id).
    css("background-color", player.color).
    css("color", player.killer ? "red" : "white").
    append("<span class='command'/>");
  $("ul#players").prepend(li);
}
