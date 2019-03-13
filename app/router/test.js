'use strict';

const { TestCtrl } = require('../controller');

module.exports = (router) => {
    router.get('/test', TestCtrl.index);
};