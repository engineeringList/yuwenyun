'use strict';

const { TestCtrl } = require('../controller');

module.exports = (router) => {
    router.get('/api/report/admin/homeworkCorrect', TestCtrl.homeworkCorrect);
    router.get('/api/report/admin/homeworkCount', TestCtrl.homeworkCount);
    router.get('/api/report/admin/clssHomework', TestCtrl.clssHomework);
    router.get('/api/report/admin/homeworkColumn', TestCtrl.homeworkColumn);
    // 学习努力度报告相关接口
    router.get('/api/report/admin/learningReport', TestCtrl.learningReport);
};