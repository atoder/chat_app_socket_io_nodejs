var PORT = process.env.PORT || 3000;
var moment = require('moment');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/public'));

var clientInfo = {};

function sendPrivateMessage(socket, from, text) {
  var fullText = text.substr(9);
  var to = fullText.substr(0, fullText.indexOf(' ')).trim();
  var message = fullText.substr(fullText.indexOf(' ') + 1).trim();
  if (typeof clientInfo === 'undefined') {
    return;
  }
  // show the private message to yourself as well
  io.to(socket.id).emit('message', {
    name: from,
    text: '@' + to + ': ' + message,
    timestamp: moment().valueOf()
  });

  var toSocketId = null;
  Object.keys(clientInfo).forEach(function (socketId) {
    var userInfo = clientInfo[socketId];
    if (userInfo.name === to) {
      // send the private message to intended user
      io.to(socketId).emit('message', {
        name: from,
        text: '@' + from + ': ' + message,
        timestamp: moment().valueOf()
      });
    }
  });
}
// send current users to provided socket
function sendCurrentUsers (socket) {
  var info = clientInfo[socket.id];
  var users = [];
  if (typeof info === 'undefined') {
    return;
  }

  Object.keys(clientInfo).forEach(function (socketId) {
    var userInfo = clientInfo[socketId];

    if (info.room === userInfo.room) {
      users.push(userInfo.name);
    }
  });

  socket.emit('message', {
    name: 'System',
    text: 'Current users: ' + users.join(', '),
    timestamp: moment().valueOf()
  });
}

io.on('connection', function (socket) {
  console.log('User connected via socket.io!');
  socket.on('disconnect', function () {
    var userData = clientInfo[socket.id];
    if (typeof userData !== 'undefined') {
      socket.leave(userData.room);
      io.to(userData.room).emit('message', {
        name: 'System',
        text: userData.name + ' has left!',
        timestamp: moment().valueOf()
      });
      delete clientInfo[socket.id];
    }
  });

  socket.on('joinRoom', function (req) {
    console.log('join room req: ' + JSON.stringify(req));
    console.log('req room: ' + req.room);
    clientInfo[socket.id] = req;
    socket.join(req.room);
    socket.broadcast.to(req.room).emit('message', {
      name: 'System',
      text: req.name + ' has joined!',
      timestamp: moment().valueOf()
    });
    sendCurrentUsers(socket);
  });

  socket.on('message', function (message) {
    console.log('Message received: ' + message.text);
    console.log(message);
    //socket.broadcast.emit('message', message);
    if (message.text === '@currentUsers') {
      sendCurrentUsers(socket);
    } else if (message.text.substr(0,8) === '@private') {
      // if a message starts with private
      sendPrivateMessage(socket, message.name, message.text);
    } else {
      message.timestamp = moment().valueOf();
      io.to(clientInfo[socket.id].room).emit('message', message);
    }
  });

  socket.emit('message', {
    name: 'System',
    text: 'Welcome to the chat application!',
    timestamp: moment().valueOf()
  })
});

http.listen(PORT, function() {
  console.log('Server started!');
});
