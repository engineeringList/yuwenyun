'use strict';

const { TestCtrl } = require('../controller');

module.exports = (router) => {
    router.get('/api/report/admin/homeworkCorrect', TestCtrl.homeworkCorrect);
    router.get('/api/report/admin/homeworkCount', TestCtrl.homeworkCount);
    router.get('/api/report/admin/clssHomework', TestCtrl.clssHomework);
    router.get('/api/report/admin/homeworkColumn', TestCtrl.homeworkColumn);
    // 学习努力度报告相关接口
    router.get('/api/report/admin/learningReport', TestCtrl.learningReport);
    // 后台端学生活跃度相关接口
    router.get('/api/report/admin/livenessReport', TestCtrl.livenessReport);
    // 获取师生互动相关信息接口
    router.get('/api/report/admin/teacherStudentInteraction', TestCtrl.teacherStudentInteraction);
    // 后台端教师作业管理情况相关接口
    router.get('/api/report/admin/teacherTaskManger', TestCtrl.teacherTaskManger);
    // 后台端习题数量相关接口
    router.get('/api/report/admin/exerciseNumber', TestCtrl.exerciseNumber);
    // 后台端班级信息汇总相关接口
    router.get('/api/report/admin/classInformationCollect', TestCtrl.classInformationCollect);
    // 后台端布置作业相关接口
    router.get('/api/report/admin/arrangeHomework', TestCtrl.arrangeHomework);
};