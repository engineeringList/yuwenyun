'use strict';

const { TestCtrl } = require('../controller');

module.exports = (router) => {
    router.get('/api/report/admin/homeworkCorrect', TestCtrl.homeworkCorrect);
};