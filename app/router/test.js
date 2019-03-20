'use strict';

const { TestCtrl } = require('../controller');

module.exports = (router) => {
    // 后台端布置作业相关接口
    router.get('/api/report/admin/arrangeHomework', TestCtrl.arrangeHomework);
    // 能力模型报告相关接口
    router.get('/api/report/admin/abilityReport', TestCtrl.abilityReport);
    // 后台端学校作业管理统计报表相关接口
    router.get('/api/report/admin/clssHomework', TestCtrl.clssHomework);
    // 学习努力度报告相关接口
    router.get('/api/report/admin/learningReport', TestCtrl.learningReport);
    // 后台端习题数量相关接口
    router.get('/api/report/admin/exerciseNumber', TestCtrl.exerciseNumber);
    // 后台端作业分类统计报表相关接口
    router.get('/api/report/admin/homeworkColumn', TestCtrl.homeworkColumn);
    // 后台端作业批改统计报表相关接口
    router.get('/api/report/admin/homeworkCorrect', TestCtrl.homeworkCorrect);
    // 后台端作业布置作业报表相关接口
    router.get('/api/report/admin/homeworkCount', TestCtrl.homeworkCount);
    // 后台端作业得分率报表相关接口
    router.get('/api/report/admin/homeworkRate', TestCtrl.homeworkRate);
    // 后台端学生活跃度相关接口
    router.get('/api/report/admin/livenessReport', TestCtrl.livenessReport);
    // 后台端学校信息汇总相关接口
    router.get('/api/report/admin/schoolInformationCollect', TestCtrl.schoolInformationCollect);
    // 后台端师生互动报表相关接口
    router.get('/api/report/admin/teacherStudentInteraction', TestCtrl.teacherStudentInteraction);
    // 后台端班级信息汇总相关接口
    router.get('/api/report/admin/classInformationCollect', TestCtrl.classInformationCollect);
    // 后台端学生作业完成情况相关接口
    router.get('/api/report/admin/taskCompleteSituation', TestCtrl.taskCompleteSituation);
    // 后台端教师信息汇总相关接口
    router.get('/api/report/admin/teacherInformationCollect', TestCtrl.teacherInformationCollect);
    // 后台端教师作业管理情况相关接口
    router.get('/api/report/admin/teacherTaskManger', TestCtrl.teacherTaskManger);



    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
};