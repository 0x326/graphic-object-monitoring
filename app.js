// Set-up Webserver
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

// Set-up drone controller
const WaypointNavigator = require("./");
var waypointNavigation = new WaypointNavigator();

server.listen(3000);
app.use(express.static('public'));

io.on('connection', function (socket) {
    socket.emit('news', { hello: 'world' });
    socket.on('my other event', function (data) {
        console.log(data);
    });
});

waypointNavigation.mission().client().on('navdata', function (data) {
    io.emit('navdata', data);
});
