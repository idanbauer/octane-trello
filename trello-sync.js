'use strict';

module.exports = function () {

    var trelloClient = require('./trello-client.js')(),
        logger = require('./logger.js').logger,
        ngaClient = require('./nga-client.js')();



    function syncTrello(boardId) {
        var promises = [];
        promises.push(trelloClient.getLists(boardId));
        promises.push(trelloClient.getCards(boardId));
        Promise.all(promises).then(results => {
            ngaClient.syncLists(results[0]).then(epics => {
                ngaClient.syncCards(results[1], epics);
            })
                .catch(err => {
                    logger.error(err);
                });
            // for (let list of results[0]) {
            //     var changeModel = {
            //         type: 'updateList',
            //         id: list.id,
            //         description: 'This is a new description'
            //     };
            //     ngaClient.updateEntity(changeModel);
            //     // ngaClient.getWorkItemByTrelloId('theme', list.id).then( themes => {
            //     //     logger.info(themes);
            //     // })
            //     // .catch(err => logger.error(err));
            // }
            // for (let card of results[1]) {
            //     var cardChangeModel = {
            //         type: 'updateCard',
            //         id: card.id,
            //         list: '5761583cc016fc74656bc7e4'
            //     };
            //     ngaClient.updateEntity(cardChangeModel);
            // }
        }).catch(err => logger.error(err));
    }

    function updateChange(changeModel) {
        var change = trelloClient.determineChange(changeModel);
        if (change.type === 'createList' || change.type === 'createCard'){
            return ngaClient.createEntity(change);
        } else {
            return ngaClient.updateEntity(change);
        }
    }

    return {
        syncTrello: syncTrello,
        updateChange: updateChange
    };
};