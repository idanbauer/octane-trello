'use strict';

module.exports = function () {

    var Trello = require('node-trello'),
        ngaConnector = require('./nga-connector')(),
        logger = require('./logger.js').logger;

    var boardId = 'D1QG8WXp';

    var t = new Trello('563b62ae18a4f894b4bad7b6ee030fae', 'edadc745298522bf828883766c4f88449f634510d70ac7e58a5ce8b34a9e1807');

    var epics = {};

    var rootId = 1001;
    var defaultUser = { 'name': 'albus-dumbledore@hpe.com', 'language': 'lang.en', 'id': 1001, 'type': 'workspace_user', 'email': 'albus-dumbledore@hpe.com', 'groups': [], 'phone1': '000', 'fullName': 'Albus Dumbledore' }
    var epicPhaseId = 1017;
    var featurePhaseId = 1021;

    function getLists() {
        t.get(`/1/boards/${boardId}/lists?fields=name`).then(lists => {
            lists.forEach(list => {
                ngaConnector.postRequest(undefined, 'work_items',
                    {
                        data: [
                            {
                                parent:
                                { id: rootId, subtype: 'work_item_root', type: 'work_item' },
                                author: defaultUser,
                                subtype: 'epic',
                                phase: { id: epicPhaseId, type: 'phase' },
                                name: list.name,
                                trello_id: list.id
                            }]
                    })
                    .then((epic) => {
                        logger.debug('epic: ' + require('util').inspect(epic.data.data[0]));
                        logger.debug('list id: ' + list.id);
                        epics[list.id] = epic.data.data[0];
                        //console.log('epic keys' + require('util').inspect(epics));

                    })
                    .catch(err => logger.error(err));

            });

        })
            .catch(err => {
                logger.error(err);
            });
    }


    function getCards() {
        t.get(`/1/boards/${boardId}/cards`).then(cards => {
            logger.debug('epics: ' + require('util').inspect(epics));
            for (card of cards) {
                var currEpic = epics[card.idList];
                logger.debug('list id: ' + card.idList);
                logger.debug('curr epic: ' + currEpic);
                logger.debug('card: ', card);
                ngaConnector.postRequest(undefined, 'work_items',
                    {
                        'data': [
                            {
                                'parent': { 'id': currEpic.id, 'type': 'work_item', 'subtype': 'epic', 'name': currEpic.name },
                                'author': defaultUser,
                                'release': null,
                                'subtype': 'feature',
                                'phase': { 'id': featurePhaseId, 'type': 'phase' },
                                'name': card.name,
                                trello_id: card.id,
                                description: card.desc
                            }]
                    })
                    .then((feature) => {
                        //console.log('created ',  feature.data.data[0]);
                    })
                    .catch(err => logger.error(err));
            }

        })
            .catch(err => {
                logger.error(err);
            });

    }

    function getBoards() {
        var promise = new Promise((resolve, reject) => {
            t.get('/1/members/me/boards', (err, boards) => {
                if (err) {
                    logger.error(err);
                    reject(err);
                }
                resolve(boards);
            });
        });
        return promise;
    }

    function registerWebHook(boardId) {
        t.post('/1/webhooks', {
            description: 'changes webhook',
            callbackURL: 'http://hackathon.almoctane.com:3000/trelloCallback',
            idModel: boardId
        }, (err, data) => {
            if (err) {
                logger.error('could not register webhook:' + err);
            }
            logger.info('webhook registerd: ', data);
        });
    }


    return {
        getLists: getLists,
        getBoards: getBoards,
        getCards: getCards,
        registerWebHook: registerWebHook
    };


};