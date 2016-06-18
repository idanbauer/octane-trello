//var trelloClient = require('./trello-client.js')();
require('./logger.js');
require('./server.js');
var trelloClient = require('./trello-client.js');

trelloClient.registerWebhookd('57605a53fc1d296a5abbc54d');
