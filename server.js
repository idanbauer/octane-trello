'use strict';

var koa = require('koa'),
    router = require('koa-router')(),
    logger = require('./logger.js').logger,
    views = require('co-views'),
    body = require('koa-better-body'),
    trelloClient = require('./trello-client.js')();


var serverPort = 3000;

var app =  module.exports = koa();

var render = views(__dirname + '/views', {map: {html: 'swig' }});

app.use(body());

router.get('/', function *(next){
    var boards = yield trelloClient.getBoards();
    this.body = yield render('index', {boards: boards});
});

router.head('/trelloCallback', function *(next){
    this.status = 200;
});

router.post('/trelloCallback', function *(next){
    logger.info(require('util').inspect(this.body));
});


app.use(router.routes());
app.use(router.allowedMethods());

app.listen(serverPort, () => {
    logger.info(`server is up on port ${serverPort}`);
});


