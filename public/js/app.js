var socket = io();

socket.on('connect', function () {
  console.log('Connected to socket.io server');
});

socket.on('message', function (message) {
  console.log('New message: ' + message.text);
  jQuery('.messages').append('<p>' + message.text + '</p>');
});

// Handles submitting of new messages
var $form = jQuery('#message-form');

$form.on('submit', function() {
  event.preventDefault();
  var $message = $form.find('input[name=message]');
  socket.emit('message', {
    text: $message.val()
  });

  $message.val('').focus();
});
