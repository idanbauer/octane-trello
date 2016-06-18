'use strict';

var winston = require('winston');
winston.add(winston.transports.File, { filename: 'trello-adapter.log' });

module.exports = {
    logger: winston
};


