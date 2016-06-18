//var trelloClient = require('./trello-client.js')();
require('./logger.js');

var trelloClient = require('./trello-client.js')();
trelloClient.registerWebHook('57605a53fc1d296a5abbc54d');

require('./server.js');

