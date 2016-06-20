'use strict';

module.exports = function () {
    var settings = require('./settings.json'),
        HttpClient = require('scoped-http-client'),
        denodeify = require('denodeify'),
        logger = require('./logger.js').logger,
        request = denodeify(require('request'));

    function setCookies(res) {
        var cookies = '';
        res.headers['set-cookie'].forEach(function (cookie) {
            cookies += cookie + ';';
        });
        return cookies;
    }



    function authenticate() {
        return request({
            url: settings.host + '/authentication/sign_in',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            method: 'POST',
            json: {
                'client_id': settings.clientId,
                'client_secret': settings.clientSecret
            }
        })
            .then(authRes => {
                if (authRes.statusCode !== 200) {
                    logger.error(`could not login to Octane: ${authRes.statusCode}: ${authRes.statusMessage}`);
                    throw authRes.statusMessage;
                }
                return authRes;
            })
            .catch(err => {
                logger.error(`could not login to Octane: ${err}`);
                throw err;
            });
    }


    function buildApiCall(apiCall) {
        return settings.host + '/api/shared_spaces/' + settings.sharedSpace + '/workspaces/' + settings.workspace + '/' + apiCall;
    }

    function convertFilterObjToString(filterObj) {
        var filterString = '';
        for (let key of Object.keys(filterObj)) {
            filterString += key + '=\'' + filterObj[key] + '\';';
        }
        filterString = filterString.slice(0, -1);
        return filterString;
    }

    function buildFilter(queryObj) {
        var filterString = `?limit=100&query="${convertFilterObjToString(queryObj)}"`;
        logger.info('filter string: ' + filterString);
        return filterString;
    }

    function buildHeader(authRes) {
        var csrfRegexRes = /HPSSO_COOKIE_CSRF=(\w*\d*);/.exec(authRes.headers['set-cookie']);
        var retVal = {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'Cookie': setCookies(authRes),
            'HPECLIENTTYPE': 'HPE_REST_TESTS_TEMP'
        };

        if (csrfRegexRes && csrfRegexRes.length > 1) {
            retVal['HPSSO-HEADER-CSRF'] = csrfRegexRes[1];
        }
        return retVal;
    }

    function parseJsonResponse(body) {
        try {
            return JSON.parse(body);
        }
        catch (err) {
            return body;
        }
    }

    function parseResponse(resolve, reject, err, res, body) {
        if (err) {
            logger.error('error: ' + err);
            logger.error('body: ' + body);
            reject(err);
        }

        if (res.statusCode !== 201 || res.statusCode !== 200) {
            logger.warn('statusCode: ' + res.statusCode);
            logger.warn('body: ' + require('util').inspect(body));
        }

        var parsedBody = parseJsonResponse(body);
        resolve({ res: res, data: parsedBody });
        //cb(err, res, parsedBody);
    }

    function getRequest(apiCall) {
        var promise = new Promise((resolve, reject) => {
            authenticate().then((authRes) => {
                HttpClient.create(buildApiCall(apiCall))
                    .headers(buildHeader(authRes))
                    .get()(function (err, res, body) {
                        if (err) {
                            reject('error: ' + err);
                        }

                        if (res.statusCode !== 200) {
                            logger.warn('statusCode: ' + res.statusCode);
                        }
                        var parsedBody = parseJsonResponse(body);
                        resolve({ res: res, data: parsedBody });
                    });
            })
                .catch(err => reject(err));
        });
        return promise;
    }

    function postRequest(apiCall, data) {
        var promise = new Promise((resolve, reject) => {
            authenticate().then((authRes) => {
                request({
                    url: buildApiCall(apiCall),
                    method: 'POST',
                    headers: buildHeader(authRes),
                    json: data
                },
                    function (err, res, body) {
                        parseResponse(resolve, reject, err, res, body);
                    });
            })
                .catch(err => reject(err));
        });
        return promise;
    }

    function putRequest(apiCall, entityId, data) {
        var promise = new Promise((resolve, reject) => {
            authenticate().then((authRes) => {
                request({
                    url: buildApiCall(apiCall) + '/' + entityId,
                    method: 'PUT',
                    headers: buildHeader(authRes),
                    json: data
                },
                    function (err, res, body) {
                        parseResponse(resolve, reject, err, res, body);
                    });
            })
                .catch(err => reject(err));
        });
        return promise;
    }

    function filter(apiCall, filterObj) {
        var promise = new Promise((resolve, reject) => {
            authenticate().then((authRes) => {
                HttpClient.create(buildApiCall(apiCall) + buildFilter(filterObj))
                    .headers(buildHeader(authRes))
                    .get()(function (err, res, body) {
                        if (err) {
                            reject('error: ' + err);
                        }

                        if (res.statusCode !== 200) {
                            logger.warn('filter statusCode: ' + res.statusCode);
                        }
                        var parsedBody = parseJsonResponse(body);
                        resolve({ res: res, data: parsedBody });
                    });
            })
                .catch(err => reject(err));
        });
        return promise;
    }

    return {
        getRequest: getRequest,
        postRequest: postRequest,
        putRequest: putRequest,
        filter: filter
    };
};


