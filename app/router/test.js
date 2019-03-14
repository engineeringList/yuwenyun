'use strict';

const { TestCtrl } = require('../controller');

module.exports = (router) => {
    router.get('/api/report/admin/homeworkCorrect', TestCtrl.homeworkCorrect);
    router.get('/api/report/admin/homeworkCount', TestCtrl.homeworkCount);
};