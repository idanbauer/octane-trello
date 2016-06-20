'use strict';

module.exports = function () {

    var logger = require('./logger.js').logger,
        ngaConnector = require('./nga-connector.js')();
    const apiCall = 'work_items';
    const epicSubtype = 'theme';
    



    //hackathon
    var rootId = 2001;
    var defaultUser = {'groups':[],'fullName':'Idan Bauer','phone1':'123456','email':'idan.bauer@hpe.com','name':'idan.bauer@hpe.com','language':'lang.en','id':2001,'type':'workspace_user'};
    var epicPhaseId = 2014;
    var featurePhaseId = 2018;

    //local
    // var rootId = 3001;
    // var defaultUser = { 'name': 'albus-dumbledore@hpe.com', 'language': 'lang.en', 'id': '1001', 'type': 'workspace_user', 'email': 'albus-dumbledore@hpe.com', 'groups': [], 'phone1': '000', 'fullName': 'Albus Dumbledore' };
    // var epicPhaseId = 2014;
    // var featurePhaseId = 2018;

    function syncLists(lists) {
        var epics = {}, promises = [];
        var promise = new Promise((resolve, reject) => {
            lists.forEach(list => {
                promises.push(createEpic(list)
                    .then((epic) => {
                        //logger.debug('epic: ' + require('util').inspect(epic.data.data[0]));
                        //logger.debug('list id: ' + list.id);
                        epics[list.id] = epic.data.data[0];
                        return epic;
                        //console.log('epic keys' + require('util').inspect(epics));

                    })
                    .catch(err => logger.error(err)));

            });
            Promise.all(promises).then(function () {
                resolve(epics);
            });
        });

        return promise;
    }

    function createEpic(list) {
        return ngaConnector.postRequest(apiCall,
            {
                data: [
                    {
                        parent:
                        { id: rootId, subtype: 'work_item_root', type: 'work_item' },
                        author: defaultUser,
                        subtype: epicSubtype,
                        phase: { id: epicPhaseId, type: 'phase' },
                        name: list.name,
                        trello_id: list.id
                    }]
            });
    }


    function createFeature(epic, card) {
        return ngaConnector.postRequest(apiCall,
            {
                'data': [
                    {
                        'parent': { 'id': epic.id, 'type': 'work_item', 'subtype': epicSubtype, 'name': epic.name },
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
                logger.info('created feature: ', feature.data.data[0].name);
            })
            .catch(err => logger.error(err));
    }

    function syncCards(cards, epics) {
        for (let card of cards) {
            var currEpic = epics[card.idList];
            logger.debug('list id: ' + card.idList);
            logger.debug('curr epic: ' + currEpic);
            logger.debug('card: ', card);
            createFeature(currEpic, card);
        }
    }

    function getWorkItemByTrelloId(trelloId) {
        return ngaConnector.filter(apiCall, {
            'trello_id': trelloId
        });
    }

    function buildEntityData(changeModel) {
        var entityData = {};
        for (let item of Object.keys(changeModel)) {
            if (item !== 'id' && item !== 'type') {
                entityData[item] = changeModel[item];
            }
        }
        return entityData;
    }

    function changeParent(featureId, changeModel) {
        return getWorkItemByTrelloId(changeModel.list).then(epics => {
            var epic = epics.data.data[0];
            return ngaConnector.putRequest(apiCall, featureId, {
                id: featureId,
                parent: {
                    id: epic.id,
                    name: epic.name,
                    subtype: epicSubtype,
                    type: 'work_item'
                }
            });
        });
    }

    function updateEntity(changeModel) {
        return getWorkItemByTrelloId(changeModel.id).then(entities => {
            var entity = entities.data.data[0];
            if (changeModel.list) {
                return changeParent(entity.id, changeModel);
            }
            ngaConnector.putRequest(apiCall, entity.id, buildEntityData(changeModel));
        })
            .then(result => {
                logger.info('updated entity: ' + result.id);
            })
            .catch(err => logger.error(err));
    }

    function createEntity(changeModel) {
        if (changeModel.type === 'createList') {
            let list = {
                id: changeModel.data.list.id,
                name: changeModel.data.list.name
            };
            return createEpic(list);
        } else if (changeModel.type === 'createCard') {
            return getWorkItemByTrelloId(changeModel.data.list.id).then(epics => {
                var epic = epics.data.data[0];
                var card = {
                    id: changeModel.data.card.id,
                    name: changeModel.data.card.name,
                    description: changeModel.data.card.desc
                };
                return createFeature(epic, card);
            });
        }
    }



    return {
        syncLists: syncLists,
        syncCards: syncCards,
        getWorkItemByTrelloId: getWorkItemByTrelloId,
        updateEntity: updateEntity,
        createEntity: createEntity
    };
};