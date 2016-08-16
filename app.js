// Set-up Webserver
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(3000);
app.use(express.static('public'));

// Emit this object on a regular basis
io.emit('checkObject', data);
