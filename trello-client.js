'use strict';

module.exports = function () {

    var Trello = require('node-trello'),
        logger = require('./logger.js').logger;

    var t = new Trello('563b62ae18a4f894b4bad7b6ee030fae', 'edadc745298522bf828883766c4f88449f634510d70ac7e58a5ce8b34a9e1807');

    function getLists(boardId) {
        var promise = new Promise((resolve, reject) => {
            t.get(`/1/boards/${boardId}/lists?fields=name`, (err, lists) => {
                if (err) {
                    reject(err);
                }
                resolve(lists);

            });
        });
        return promise;
    }


    function getCards(boardId) {

        var promise = new Promise((resolve, reject) => {
            t.get(`/1/boards/${boardId}/cards`, (err, cards) => {
                if (err) {
                    reject(err);
                }
                resolve(cards);

            });
        });
        return promise;
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
            description: 'changes webhook for ' + boardId,
            callbackURL: 'http://hackathon.almoctane.com:3000/trelloCallback',
            idModel: boardId
        }, (err, data) => {
            if (err) {
                logger.error('could not register webhook:' + err);
                return;
            }
            logger.info('webhook registerd: ', data);
        });
    }

    function determineChange(model) {
        if (model.action.type === 'createList' || model.action.type === 'createCard') {
            return  {
                type: model.action.type,
                data: model.action.data
            };
        }

        var data = model.action.data;
        var changeModel = {
            type: model.action.type,
            id: model.action.type === 'updateCard' ? data.card.id : data.list.id
        };
        if (model.action.type === 'updateCard') {
            //card was moved to a new list
            if (data.old.pos) {
                changeModel.list = data.list.id;
            } else if (data.old.desc) {
                changeModel.description = data.card.desc;
            } else if (data.old.name) {
                changeModel.name = data.card.name;
            }

        } else if (model.action.type === 'updateList') {
            if (data.old.name) {
                changeModel.name = data.name;
            }
        }
        return changeModel;
    }


    return {
        getLists: getLists,
        getBoards: getBoards,
        getCards: getCards,
        registerWebHook: registerWebHook,
        determineChange: determineChange
    };
};