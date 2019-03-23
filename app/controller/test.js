'use strict';

const TestCtrl = {};
const _request = require('../lib/req');
const { School, Classes } = require('../models');
const mongoose = require('mongoose')
const mongodb = require('mongodb')
var mongoUtil = require('../lib/mongoUtil');
var MongoClient = require('mongodb').MongoClient;
var uri = `mongodb://root:huangkai123!%40#@dds-uf6338efc0fe68741988-pub.mongodb.rds.aliyuncs.com:3717/yuwenyun?authSource=admin`

const aliUrl = 'http://es-cn-0pp116ay3000md3ux.public.elasticsearch.aliyuncs.com';


// db.collection( 'users' ).find();

// let username = 'elastic'
// let password = 'Re12345678'
// let auth = "Basic " + new Buffer(username + ":" + password).toString("base64")

TestCtrl.homeworkCorrect = async (ctx) => {
    ctx.body = {
        errno: 0,
        errmsg: '',
        data: {}
    }
    const { teacher_ids, start_time, end_time, cycle_type, type } = ctx.query;
    if (!teacher_ids || !cycle_type || !type) {
        ctx.body.errmsg = '参数不全';
        return
    }
    const teacherAry = teacher_ids.split(',');
    // let must_not = [];
    let must = [
        {
            range: {
                'task.add_time': {
                    gte: start_time,
                    lte: end_time
                }
            }
        },
        {
            term: {
                policy: 1,
            }
        },
        {
            term: {
                'task.type': 'homework',
            }
        }
    ]
    const params = {
        _source: ['policy', 'task.teacher', 'status'],
        query: {
            bool: {
                must: [],
                must_not: []
            },
        },
        aggs: {
            group_by_addTime: {
                date_histogram: {
                    script: {
                        inline: "doc['task.add_time'].value * 1000"
                    },
                    interval: cycle_type,
                    // format: 'yyyy-MM-dd',
                    min_doc_count: 0,
                }
            }
        },
        size: 0
    }
    const options = {
        url: `${aliUrl}:9200/taskquestions/_search`,
        metch: 'POST',
        headers: {
            "Authorization": 'Basic ZWxhc3RpYzokUmUxMjM0NTY3OA==',
            'Content-Type': 'application/json'
        }
    }
    ctx.body.data.data = [];
    if (type == '手工批改数') {
        must.push({
            term: {
                'status.keyword': '已批改',
            }
        });
        for (let teacher_id of teacherAry) {
            let _must = must.map(function (value) {
                return value;
            });
            _must.push({
                term: {
                    'task.teacher._id': teacher_id
                }
            });
            params.query.bool.must = _must;
            options.body = JSON.stringify(params);
            const body = await _request(options);
            // ctx.body.data.correct = body
            // ctx.body.data.correct = params
            ctx.body.data.data.push({
                teacher_id: teacher_id,
                arr: body.aggregations.group_by_addTime.buckets
            })
        }
    } else if (type == '批改率') {
        let ratify, all;
        for (let teacher_id of teacherAry) {
            // 批改数
            let _must = must.map(function (value) {
                return value;
            });
            _must.push({
                term: {
                    'task.teacher._id': teacher_id
                }
            });
            _must.push({
                term: {
                    'status.keyword': '已批改',
                }
            });
            params.query.bool.must = _must;
            options.body = JSON.stringify(params);
            ratify = await _request(options);
            // 提交总数
            params.query.bool.must = params.query.bool.must.slice(0, -1);
            params.query.bool.must_not.push({
                term: {
                    'status.keyword': '未答题',
                }
            });
            options.body = JSON.stringify(params);
            all = await _request(options);
            // ctx.body = all
            // return
            params.query.bool.must_not = [];
            let len = all.aggregations.group_by_addTime.buckets.length;
            const ratifyBuckets = ratify.aggregations.group_by_addTime.buckets;
            const allBuckets = all.aggregations.group_by_addTime.buckets;
            let buckets = [];
            for (let i = 0; i < len; i++) {
                if (ratifyBuckets[i] && allBuckets[i].doc_count) {
                    buckets.push({
                        key: allBuckets[i].key,
                        doc_count: ((ratifyBuckets[i].doc_count / allBuckets[i].doc_count) * 100).toFixed(2)
                    });
                } else {
                    buckets.push({
                        key: allBuckets[i].key,
                        doc_count: 0
                    });
                }
            }
            ctx.body.data.data.push({
                teacher_id: teacher_id,
                arr: buckets
            })
        }
    } else if (type == '批注率') {
        for (let teacher_id of teacherAry) {
            // 批注数
            let comment, all;
            let _must = must.map(function (value) {
                return value;
            });
            _must.push({
                term: {
                    'task.teacher._id': teacher_id
                }
            });
            _must.push({
                term: {
                    'status.keyword': '已批改',
                }
            });
            _must.push({
                exists: {
                    field: 'correct',
                }
            });
            params.query.bool.must = _must;
            options.body = JSON.stringify(params);
            comment = await _request(options);
            // 批注总数
            params.query.bool.must = params.query.bool.must.slice(0, -1);
            options.body = JSON.stringify(params);
            all = await _request(options);
            let len = all.aggregations.group_by_addTime.buckets.length;
            const commentBuckets = comment.aggregations.group_by_addTime.buckets;
            const allBuckets = all.aggregations.group_by_addTime.buckets;
            let buckets = [];
            for (let i = 0; i < len; i++) {
                if (commentBuckets[i] && allBuckets[i].doc_count) {
                    buckets.push({
                        key: allBuckets[i].key,
                        doc_count: ((commentBuckets[i].doc_count / allBuckets[i].doc_count) * 100).toFixed(2)
                    });
                } else {
                    buckets.push({
                        key: allBuckets[i].key,
                        doc_count: 0
                    });
                }
            }
            ctx.body.data.data.push({
                teacher_id: teacher_id,
                arr: buckets
            });
        }
    }
}

TestCtrl.teacherInformationCollect = async (ctx) => {
    ctx.body = {
        errno: 0,
        errmsg: '',
        data: {}
    }
    const { teacher_name } = ctx.query;
    if (!teacher_name) {
        ctx.body.errmsg = '参数不全';
        return
    }
    const teachers = await db.collection('teachers').find({
        name: { $regex: teacher_name } 
    }).toArray();
    const options = {
        url: `${aliUrl}:9200/taskquestions/_search`,
        metch: 'POST',
        // body: JSON.stringify(params),
        headers: {
            "Authorization": 'Basic ZWxhc3RpYzokUmUxMjM0NTY3OA==',
            'Content-Type': 'application/json'
        }
    }
    ctx.body.data.data = [];
    for (let teacher of teachers) {
        let obj = {}
        const teacherId = teacher._id;
        const grade = await db.collection('classes').findOne({
            'class_teacher.$id': mongodb.ObjectID(teacherId)
        });
        // console.log(grade)
        obj.teacher_name = teacher.name;
        obj.class_name = '';
        if (grade) {
            obj.class_name = grade.class_name;
        }
        const params = {
            query: {
                bool: {
                    filter: [],
                    must: [],
                    must_not: []
                },
            },
            aggs: {},
            size: 0
        }
        params.query.bool.must.push({
            term: {
                'task.teacher._id': teacherId
            }
        })
        // 布置作业次数
        params.aggs = {
            count: {
                cardinality: {
                    field: 'task.id.keyword'
                }
            }
        }
        options.body = JSON.stringify(params);
        let body = await _request(options);
        obj.task_time = body.aggregations.count.value;
        // 布置作业题数统计
        obj.task_number = body.hits.total;
        // 手工批改作业题数
        params.query.bool.must.push({
            term: {
                'status.keyword': '已批改'
            }
        });
        options.body = JSON.stringify(params);
        body = await _request(options);
        obj.manual_task_number = body.hits.total;
        // 提交总数
        params.query.bool.must = params.query.bool.must.slice(0, -1);
        params.query.bool.must_not.push({
            term: {
                'status.keyword': '未答题'
            }
        });
        options.body = JSON.stringify(params);
        body = await _request(options);
        const submitTotal = body.hits.total;
        obj.manual_correct_rate = ((obj.manual_task_number / submitTotal) * 100).toFixed(2);
        delete params.query.bool.must_not;
        params.query.bool.must.push({
            term: {
                'status.keyword': '已批改'
            }
        });
        params.query.bool.must.push({
            exists: {
                field: 'correct'
            }
        });
        options.body = JSON.stringify(params);
        body = await _request(options);
        obj.manual_postil_rate = ((body.hits.total / submitTotal) * 100).toFixed(2);
        ctx.body.data.data.push(obj);
        // console.log(grade)
        // ctx.body = params
        // return
    }
}

TestCtrl.clssHomework = async (ctx) => {
    ctx.body = {
        errno: 0,
        errmsg: '',
        data: {}
    }
    const { class_ids, start_time, end_time, cycle_type, type } = ctx.query;
    if (!class_ids || !cycle_type || !type) {
        ctx.body.errmsg = '参数不全';
        return
    }
    const classAry = class_ids.split(',');
    // let must_not = [];
    let must = [
        {
            range: {
                'task.add_time': {
                    gte: start_time,
                    lte: end_time
                    // gte: 1250470402,
                    // lte: 1850470412
                }
            }
        },
        {
            term: {
                policy: 1,
            }
        },
        {
            term: {
                "task.type": "homework",
            }
        }
    ]
    const params = {
        query: {
            bool: {
                must: [],
                must_not: []
            },
        },
        aggs: {
            group_by_addTime: {
                date_histogram: {
                    script: {
                        inline: "doc['task.add_time'].value * 1000"
                    },
                    interval: cycle_type,
                    min_doc_count: 0
                },
            }
        },
        size: 0
    }
    const options = {
        url: `http://es-cn-0pp116ay3000md3ux.public.elasticsearch.aliyuncs.com:9200/taskquestions/_search`,
        metch: 'POST',
        // body: JSON.stringify(params),
        headers: {
            "Authorization": 'Basic ZWxhc3RpYzokUmUxMjM0NTY3OA==',
            'Content-Type': 'application/json'
        }
    }
    ctx.body.data.data = [];
    if (type == '批改率') {
        let ratify, all;
        for (let class_id of classAry) {
            // 批改数
            let _must = must.map(function (value) {
                return value;
            });
            _must.push({
                term: {
                    'task.class._id': class_id
                }
            });
            _must.push({
                term: {
                    'status.keyword': '已批改',
                }
            });
            params.query.bool.must = _must;
            options.body = JSON.stringify(params);
            ratify = await _request(options);
            // ctx.body.data.class = ratify
            // return
            // 提交总数
            params.query.bool.must = params.query.bool.must.slice(0, -1);
            params.query.bool.must_not.push({
                term: {
                    'status.keyword': '未答题',
                }
            });
            options.body = JSON.stringify(params);
            all = await _request(options);
            params.query.bool.must_not = [];
            let len = all.aggregations.group_by_addTime.buckets.length;
            const ratifyBuckets = ratify.aggregations.group_by_addTime.buckets;
            const allBuckets = all.aggregations.group_by_addTime.buckets;
            let buckets = [];
            for (let i = 0; i < len; i++) {
                if (ratifyBuckets[i] && allBuckets[i].doc_count) {
                    buckets.push({
                        key: allBuckets[i].key,
                        doc_count: ((ratifyBuckets[i].doc_count / allBuckets[i].doc_count) * 100).toFixed(2)
                    });
                } else {
                    buckets.push({
                        key: allBuckets[i].key,
                        doc_count: 0
                    });
                }
            }
            ctx.body.data.data.push({
                class_id: class_id,
                arr: buckets
            })
        }
    } else if (type == '布置作业次数') {
        params.aggs.group_by_addTime.aggs = {
            homework_count: {
                cardinality: {
                    field: 'task.id.keyword'
                }
            }
        }
        for (let class_id of classAry) {
            let _must = must.map(function (value) {
                return value;
            })
            _must.push({
                term: {
                    'task.class._id': class_id
                }
            })
            params.query.bool.must = _must;
            options.body = JSON.stringify(params);
            const body = await _request(options);
            // ctx.body.data.correct = body
            // ctx.body.data.correct = params
            ctx.body.data.data.push({
                class_id: class_id,
                arr: body.aggregations.group_by_addTime.buckets
            })
        }
    }
}

TestCtrl.homeworkCount = async (ctx) => {
    ctx.body = {
        errno: 0,
        errmsg: '',
        data: {}
    }
    const { teacher_ids, start_time, end_time, cycle_type, type } = ctx.query;
    if (!teacher_ids || !cycle_type || !type) {
        ctx.body.errmsg = '参数不全';
        return
    }
    const teacherAry = teacher_ids.split(',');
    let must = [
        {
            range: {
                'task.add_time': {
                    gte: start_time,
                    lte: end_time
                }
            }
        },
        {
            term: {
                "task.type": "homework",
            }
        }
    ]
    const params = {
        query: {
            bool: {
                must: [],
                must_not: []
            },
        },
        aggs: {
            group_by_addTime: {
                date_histogram: {
                    script: {
                        inline: "doc['task.add_time'].value * 1000"
                    },
                    interval: cycle_type,
                    min_doc_count: 0
                }
            }
        },
        size: 0
    }
    const options = {
        url: `${aliUrl}:9200/taskquestions/_search`,
        metch: 'POST',
        // body: JSON.stringify(params),
        headers: {
            "Authorization": 'Basic ZWxhc3RpYzokUmUxMjM0NTY3OA==',
            'Content-Type': 'application/json'
        }
    }
    ctx.body.data.data = [];
    if (type == '布置作业次数') {
        params.aggs.group_by_addTime.aggs = {
            homework_count: {
                cardinality: {
                    field: 'task.id.keyword'
                }
            }
        }
    } else if (type == '布置作业题数') {
        params.aggs.group_by_addTime.aggs = {
            homework_count: {
                cardinality: {
                    field: "question_id.keyword"
                }
            }
        }
    }
    for (let teacher_id of teacherAry) {
        let _must = must.map(function (value) {
            return value;
        })
        _must.push({
            term: {
                'task.teacher._id': teacher_id
            }
        })
        params.query.bool.must = _must;
        options.body = JSON.stringify(params);
        const body = await _request(options);
        // ctx.body.data.correct = body
        // ctx.body.data.correct = params
        ctx.body.data.data.push({
            teacher_id: teacher_id,
            buckets: body.aggregations.group_by_addTime.buckets
        })
    }
}

TestCtrl.homeworkColumn = async (ctx) => {
    ctx.body = {
        errno: 0,
        errmsg: '',
        data: {}
    }
    const { teacher_id, start_time, end_time } = ctx.query;
    if (!teacher_id) {
        ctx.body.errmsg = '参数不全';
        return
    }
    let must = [
        {
            range: {
                'task.add_time': {
                    gte: start_time,
                    lte: end_time
                }
            }
        },
        {
            term: {
                'task.type': 'homework',
            }
        },
        {
            term: {
                'task.teacher._id': teacher_id
            }
        }
    ]
    const params = {
        query: {
            bool: {
                must: [],
                must_not: []
            },
        },
        size: 0
    }
    const options = {
        url: `${aliUrl}:9200/taskquestions/_search`,
        metch: 'POST',
        // body: JSON.stringify(params),
        headers: {
            "Authorization": 'Basic ZWxhc3RpYzokUmUxMjM0NTY3OA==',
            'Content-Type': 'application/json'
        }
    }
    ctx.body.data.data = [];
    const column_tag = [
        { id: '5a9846d051f2429a80543196c2acac5f', name: '直击高考' },
        { id: 'b0979f01974a45d18d42700e92bf7948', name: '学科图谱' },
        { id: 'e35a661269174507a019613fe13ece75', name: '教材同步' },
        { id: '4f1290f5973e4c6687deccb174e44f7d', name: '任务群学习' },
        { id: '4f470582fdd449ebb10df80e545751f9', name: '记忆工具' }
    ]
    params.query.bool.must = must;
    options.body = JSON.stringify(params);
    const all = await _request(options);
    // ctx.body = all;
    // return
    const total = all.hits.total;
    for (let tag of column_tag) {
        let _must = must.map(function (value) {
            return value;
        });
        _must.push({
            query_string: {
                default_field: 'column_tag',
                query: `*${tag.id}*`
            }
        })
        params.query.bool.must = _must;
        options.body = JSON.stringify(params);
        const body = await _request(options);
        console.log(body.hits.total)
        // return
        // ctx.body.data.column = body
        tag.doc_count = ((body.hits.total / total) * 100).toFixed(2);
        // ctx.body.data.correct = params
        ctx.body.data.data.push(tag);
    }
}

TestCtrl.learningReport = async (ctx) => {
    ctx.body = {
        errno: 0,
        errmsg: '',
        data: {}
    }
    const { params_id, start_time, end_time, type, cycle_type } = ctx.query;
    if (!params_id || !type || !cycle_type) {
        ctx.body.errmsg = '参数不全';
        return
    }
    let must = [
        {
            range: {
                'task.add_time': {
                    gte: start_time,
                    lte: end_time
                }
            }
        }
    ]
    const params = {
        query: {
            bool: {
                must: [],
                must_not: [
                    {
                        match: {
                            status: '未答题',
                        }
                    }
                ]
            },
        },
        aggs: {
            group_by_addTime: {
                date_histogram: {
                    script: {
                        inline: "doc['task.add_time'].value * 1000"
                    },
                    interval: cycle_type,
                    min_doc_count: 0
                },
            }
        },
        size: 0
    }
    const options = {
        url: `http://es-cn-0pp116ay3000md3ux.public.elasticsearch.aliyuncs.com:9200/taskquestions/_search`,
        metch: 'POST',
        // body: JSON.stringify(params),
        headers: {
            "Authorization": 'Basic ZWxhc3RpYzokUmUxMjM0NTY3OA==',
            'Content-Type': 'application/json'
        }
    }
    ctx.body.data.data = [];
    if (type == 'person') {
        must.push({
            term: {
                'task.student._id': params_id,
            }
        })
        params.query.bool.must = must;
        options.body = JSON.stringify(params);
        const body = await _request(options);
        ctx.body.data.data = body.aggregations.group_by_addTime.buckets;
    } else if (type == 'class') {
        const classAry = params_id.split(',');
        for (let class_id of classAry) {
            let _must = must.map(function (value) {
                return value;
            })
            _must.push({
                term: {
                    'task.class._id': class_id
                }
            })
            params.query.bool.must = _must;
            options.body = JSON.stringify(params);
            const body = await _request(options);
            // ctx.body.data.correct = body
            // ctx.body.data.correct = params
            ctx.body.data.data.push({
                class_id: class_id,
                buckets: body.aggregations.group_by_addTime.buckets
            });
        }
    }
}

TestCtrl.livenessReport = async (ctx) => {
    ctx.body = {
        errno: 0,
        errmsg: '',
        data: {}
    }
    const { param_id, start_time, end_time, type, cycle_type } = ctx.query;
    if (!param_id || !type || !cycle_type) {
        ctx.body.errmsg = '参数不全';
        return
    }
    let must = [
        {
            range: {
                eventtime: {
                    gte: start_time,
                    lte: end_time
                }
            }
        },
        {
            match: {
                event: 'SIGN_IN'
            }
        }
    ]
    const params = {
        query: {
            bool: {
                must: [],
                must_not: []
            },
        },
        aggs: {
            group_by_eventTime: {
                date_histogram: {
                    script: {
                        inline: "doc['eventtime'].value * 1000"
                    },
                    interval: cycle_type,
                    min_doc_count: 0,
                },
            }
        },
        size: 0
    }
    const options = {
        url: `http://es-cn-0pp116ay3000md3ux.public.elasticsearch.aliyuncs.com:9200/event/_search`,
        metch: 'POST',
        headers: {
            "Authorization": 'Basic ZWxhc3RpYzokUmUxMjM0NTY3OA==',
            'Content-Type': 'application/json'
        }
    }
    ctx.body.data.livenessReport = [];
    if (type == '学生') {
        must.push({
            term: {
                "student._id": param_id,
            }
        });
        must.push({
            term: {
                role: 'student',
            }
        });
        params.query.bool.must = must;
        options.body = JSON.stringify(params);
        const body = await _request(options);
        ctx.body.data.livenessReport = body.aggregations.group_by_eventTime.buckets;
        // ctx.body.data.livenessReport = params;
        // ctx.body.data.livenessReport = body;
    } else if (type == '教师') {
        must.push({
            term: {
                'teacher._id': param_id,
            }
        });
        must.push({
            term: {
                role: 'teacher',
            }
        });
        params.query.bool.must = must;
        options.body = JSON.stringify(params);
        const body = await _request(options);
        // ctx.body.data.livenessReport = params;
        ctx.body.data.livenessReport = body.aggregations.group_by_eventTime.buckets;
        // ctx.body.data.livenessReport = body;
    }
}

TestCtrl.taskCompleteSituation = async (ctx) => {
    ctx.body = {
        errno: 0,
        errmsg: '',
        data: {}
    }
    const { class_id, start_time, end_time, cycle_type, type } = ctx.query;
    if (!class_id || !cycle_type || !type) {
        ctx.body.errmsg = '参数不全';
        return
    }
    // const classAry = class_ids.split(',');
    // let must_not = [];
    let must = [
        {
            range: {
                'task.add_time': {
                    gte: start_time,
                    lte: end_time
                }
            }
        },
        {
            term: {
                'task.type': 'homework',
            }
        },
        {
            term: {
                'task.class._id': class_id,
            }
        }
    ];
    const params = {
        _source: ['question_score', 'total_score', 'avg'],
        query: {
            bool: {
                must: [],
                should: [],
                must_not: []
            },
        },
        aggs: {
            group_by_addTime: {
                date_histogram: {
                    script: {
                        inline: "doc['task.add_time'].value * 1000"
                    },
                    time_zone: '+08:00',
                    interval: cycle_type,
                    min_doc_count: 0,
                },
            }
        },
        script_fields: {
            "avg": {
                "script": {
                    "lang": "painless",
                    "source": "doc['question_score']"
                }
            },
        },
        // script_fields: {
        //     "add_time": {
        //         "script": {
        //             "lang": "painless",
        //             "source": "if (doc['question_type'] == '填空题') {return 1;} else {return 2;}"
        //         }
        //     },
        // },
        size: 2
    }
    const options = {
        url: `${aliUrl}:9200/taskquestions/_search`,
        metch: 'POST',
        // body: JSON.stringify(params),
        headers: {
            "Authorization": 'Basic ZWxhc3RpYzokUmUxMjM0NTY3OA==',
            'Content-Type': 'application/json'
        }
    }
    ctx.body.data = {};
    if (type == '提交率') {
        // must.push({
        //     term: {
        //         'task.class._id': class_id
        //     }
        // });
        // console.log(must)
        // ctx.body.data = must
        // return
        params.query.bool.must = must;
        options.body = JSON.stringify(params);
        const all = await _request(options);
        // ctx.body.data = all
        // return
        // 提交数
        params.query.bool.must_not.push({
            term: {
                'status.keyword': '未答题',
            }
        });
        options.body = JSON.stringify(params);
        const submit = await _request(options);
        // ctx.body.data = submit
        // return
        let len = all.aggregations.group_by_addTime.buckets.length;
        const submitBuckets = submit.aggregations.group_by_addTime.buckets;
        const allBuckets = all.aggregations.group_by_addTime.buckets;
        let buckets = [];
        for (let i = 0; i < len; i++) {
            if (submitBuckets[i] && allBuckets[i].doc_count) {
                buckets.push({
                    key: allBuckets[i].key,
                    doc_count: ((submitBuckets[i].doc_count / allBuckets[i].doc_count)  * 100).toFixed(2)
                });
            } else {
                buckets.push({
                    key: allBuckets[i].key,
                    doc_count: 0
                });
            }
        }
        ctx.body.data.arr = buckets;
    } else if (type == '得分率') {
        // must.push({
        //     term: {
        //         question_id: '5c6a075ae5d0c0e4802c5e19'
        //     }
        // })
        params.aggs.group_by_addTime.aggs = {
            aggregation: {
                avg: {
                    script: {
                        inline: "doc['question_score'].value / doc['total_score'].value"
                    }
                }
            },
        };
        params.query.bool.must = must;
        options.body = JSON.stringify(params);
        const arr = await _request(options);
        // ctx.body.data = all.aggregations
        ctx.body.data.arr = arr.aggregations.group_by_addTime.buckets
    }
}

TestCtrl.abilityReport = async (ctx) => {
    ctx.body = {
        errno: 0,
        errmsg: '',
        data: {}
    }
    const {
        parent_id,
        column_tag,
        start_time,
        end_time,
        cycle_type,
        params_id,
        type
    } = ctx.query;
    // if (!column_tag || !params_id || !type) {
    //     ctx.body.errmsg = '参数不全';
    //     return
    // }
    const columnAry = column_tag.split(',');
    const idAry = params_id.split(',');
    let must = [
        {
            range: {
                'task.add_time': {
                    gte: start_time,
                    lte: end_time
                }
            }
        }
    ];
    const params = {
        // _source: ['question_score', 'total_score'],
        query: {
            bool: {
                must: [],
                should: [],
                must_not: [],
                minimum_should_match: 1
            }
        },
        aggs: {
            aggregation: {
                avg: {
                    script: {
                        inline: "doc['question_score'].value / doc['total_score'].value"
                    }
                }
            },
        },
        size: 2
    }
    const options = {
        url: `http://es-cn-0pp116ay3000md3ux.public.elasticsearch.aliyuncs.com:9200/yuwenyun/taskquestions/_search`,
        metch: 'POST',
        // body: JSON.stringify(params),
        headers: {
            "Authorization": 'Basic ZWxhc3RpYzokUmUxMjM0NTY3OA==',
            'Content-Type': 'application/json'
        }
    }
    if (parent_id) {
        params.query.bool.should.push({
            query_string: {
                default_field: 'column_tag',
                query: `*${parent_id}*`
            }
        });
        params.query.bool.minimum_should_match = 2;
    }
    ctx.body.data = [];
    for (let id of idAry) {
        if (type == 'person') {
            must.push({
                term: {
                    'task.student._id': id
                }
            });
        } else if (type == 'class') {
            must.push({
                term: {
                    'task.class._id': id
                }
            });
        } else if (type == 'school') {
            must.push({
                term: {
                    'task.school._id': id
                }
            });
        }
        let data = [];
        for (let tag of columnAry) {
            params.query.bool.should.push({
                query_string: {
                    default_field: 'column_tag',
                    query: `*${tag}*`
                }
            });
            let _must = must.map(function (value) {
                return value;
            });
            params.query.bool.must = _must;
            options.body = JSON.stringify(params);
            const body = await _request(options);
            params.query.bool.should = params.query.bool.should.slice(0, -1);
            data.push({
                id: tag,
                value: (body.aggregations.aggregation.value * 100).toFixed(2)
            })
        }
        ctx.body.data.push({
            id: id,
            data: data
        });
    }
}

TestCtrl.schoolInformationCollect = async (ctx) => {
    ctx.body = {
        errno: 0,
        errmsg: '',
        data: {}
    }
    let {
        page, num, school_name
    } = ctx.query;
    // if (!column_tag || !params_id || !type) {
    //     ctx.body.errmsg = '参数不全';
    //     return
    // }
    num = num ? num : 10;
    let from = 0;
    if (page) {
        from = (page - 1) * num;
    }
    const options = {
        url: `${aliUrl}:9200/taskquestions/_search`,
        metch: 'POST',
        headers: {
            "Authorization": 'Basic ZWxhc3RpYzokUmUxMjM0NTY3OA==',
            'Content-Type': 'application/json'
        }
    }
    let findParams = {};
    if (school_name) {
        findParams = { school_name: { $regex: school_name } }
    }
    const schools = await db.collection('schools').find(
        findParams,
        { limit: parseInt(num), skip: parseInt(from) }
    ).toArray();
    const count = await db.collection('schools').find(
        findParams
    ).count();
    ctx.body.data.data = [];
    ctx.body.data.count = count;
    ctx.body.data.totalPage = Math.ceil(count / num);
    for (let school of schools) {
        let arr = [];
        for (let grade of school.school_classess) {
            arr.push(grade.oid)
        }
        const student = await db.collection('classes')
            .aggregate(
            [
                { '$match': { _id: { $in: arr } } },
                {
                    $project: {
                        tags_count: { $size: '$class_students' }
                    }
                },
                { $group: { _id: null, sum: { $sum: '$tags_count' } } }
            ]
            ).toArray();
        const params = {
            query: {
                bool: {
                    must: [
                        {
                            term: {
                                'task.type.keyword': 'homework'
                            }
                        },
                        {
                            term: {
                                'task.school._id': school._id
                            }
                        }
                    ],
                    must_not: [],
                }
            },
            aggs: {
                count: {
                    cardinality: {
                        field: 'task.id.keyword'
                    }
                }
            },
            size: 0
        }
        // 布置作业数
        options.body = JSON.stringify(params);
        let body = await _request(options);
        const questions_task = body.aggregations.count.value;
        // 学生答题
        const _params = {
            query: {
                bool: {
                    must: [
                        {
                            term: {
                                'task.school._id': school._id
                            }
                        }
                    ],
                    must_not: [
                        {
                            term: {
                                'status.keyword': '未答题'
                            }
                        }
                    ],
                }
            },
            size: 0
        }
        options.body = JSON.stringify(_params);
        const student_answer = body.hits.total;
        ctx.body.data.data.push({
            school_name: school.school_name,
            teacher_number: school.school_teachers.length,
            student_number: student[0].sum,
            questions_task: questions_task,
            student_answer: student_answer
        });
    }
}

TestCtrl.homeworkRate = async (ctx) => {
    ctx.body = {
        errno: 0,
        errmsg: '',
        data: {}
    }
    let { school_id, start_time, end_time, page, num } = ctx.query;
    // if (!start_time || !end_time) {
    //     ctx.body.errmsg = '参数不全';
    //     return
    // }
    let from = 0;
    num = num ? num : 10;
    if (page) {
        from = (page - 1) * num;
    }
    const options = {
        url: `${aliUrl}:9200/taskquestions/_search`,
        metch: 'POST',
        // body: JSON.stringify(params),
        headers: {
            "Authorization": 'Basic ZWxhc3RpYzokUmUxMjM0NTY3OA==',
            'Content-Type': 'application/json'
        }
    }
    const schoolParams = {};
    if (school_id) {
        schoolParams._id = mongodb.ObjectId(school_id)
    }
    let arr = [];
    const school = await db.collection('schools').find(schoolParams).toArray();
    for (let item of school) {
        for (let grade of item.school_classess) {
            if (grade.oid) {
                arr.push(grade.oid);
            }
        }
    }
    const classes = await db.collection('classes').find(
        { _id: { $in: arr } },
        { limit: parseInt(num), skip: parseInt(from) }
    ).toArray();
    // console.log(classes)
    for (let grade of classes) {
        const _school = await db.collection('schools').findOne({
            'school_classess.$id': mongodb.ObjectId(grade._id)
        });
        // console.log(school)
        // console.log(grade._id)
        grade.school_name = _school.school_name;
        const params = {
            query: {
                bool: {
                    must: [
                        {
                            range: {
                                'task.add_time': {
                                    gte: start_time,
                                    lte: end_time
                                }
                            }
                        },
                        {
                            match: {
                                'status.keyword': '已批改',
                            }
                        },
                        {
                            term: {
                                'task.class._id': grade._id,
                            }
                        }
                    ],
                    // should: [
                    //     {
                    //         bool: {
                    //             must: [{
                    //                 match: {
                    //                     'task.type.keyword': 'non_task'
                    //                 }
                    //             }],
                    //             must_not: [{
                    //                 term: {
                    //                     policy: 1
                    //                 }
                    //             }]
                    //         }
                    //     },
                    //     {
                    //         bool: {
                    //             must: {
                    //                 term: {
                    //                     policy: 1
                    //                 }
                    //             },
                    //             must_not: {
                    //                 match: {
                    //                     'task.type.keyword': 'non_task'
                    //                 }
                    //             }
                    //         }
                    //     },
                    // ],
                    must_not: [],
                    // minimum_should_match: 1
                },
            },
            // _source: ['policy'],
            aggs: {
                aggregation: {
                    avg: {
                        script: {
                            inline: "if (doc['total_score'].value == 0) { return 0 } else { return doc['question_score'].value / doc['total_score'].value }"
                        }
                    }
                },
            },
            size: 0
        }
        options.body = JSON.stringify(params);
        const score_rate = await _request(options);
        // console.log(score_rate)
        // ctx.body = score_rate;
        // return
        const val = score_rate.aggregations.aggregation.value
        grade.score_rate = val ? val : 0;
    }
    const count = arr.length
    ctx.body.data.count = count;
    ctx.body.data.totalPage = Math.ceil(count / num);
    ctx.body.data.data = classes;
}

TestCtrl.teacherStudentInteraction = async (ctx) => {
    ctx.body = {
        errno: 0,
        errmsg: '',
        data: {}
    }
    let from = 0;
    let { num, page, start_time, end_time, school_id } = ctx.query;
    num = num ? num : 10;
    if (page) {
        from = (page - 1) * num;
    }
    let must = [
        {
            range: {
                'task.add_time': {
                    gte: start_time,
                    lte: end_time
                }
            }
        },
        {
            term: {
                'task.type': 'homework',
            }
        },
        {
            match: {
                status: '已批改',
            }
        },
        {
            term: {
                policy: 1,
            }
        },
    ]
    const teacherParams = {
        _source: ['task.teacher._id'],
        from: from,
        size: num,
        collapse: {
            field: 'task.teacher._id.keyword'
        },
        aggs: {
            count: {
                cardinality: {
                    field: 'task.teacher._id.keyword'
                }
            }
        },
        query: {
            bool: {
                must: []
            }
        }
    }
    if (school_id) {
        must.push({
            term: {
                'task.school._id': school_id
            }
        });
        teacherParams.query.bool.must.push({
            term: {
                'task.school._id': school_id
            }
        });
    }
    const classParams = {
        _source: ['task.class._id'],
        query: {
            bool: {
                must: [
                    {
                        term: {
                            'task.teacher._id': ''
                        }
                    }
                ],
                must_not: []
            },
        },
        collapse: {
            field: 'task.class._id.keyword'
        }
    }
    const params = {
        query: {
            bool: {
                must: [

                ],
                must_not: []
            },
        },
        size: 0
    }
    const options = {
        url: `${aliUrl}:9200/taskquestions/_search`,
        metch: 'POST',
        // body: JSON.stringify(params),
        headers: {
            "Authorization": 'Basic ZWxhc3RpYzokUmUxMjM0NTY3OA==',
            'Content-Type': 'application/json'
        }
    }
    ctx.body.data.data = [];
    ctx.body.data.pageSize = num;
    // params.query.bool.must = must;
    options.body = JSON.stringify(teacherParams);
    const teacherlist = await _request(options);
    // ctx.body = teacherParams;
    // return 
    for (let item of teacherlist.hits.hits) {
        const teacher_id = item._source.task.teacher._id;
        let _must = must.map(function (value) {
            return value;
        });
        _must.push({
            term: {
                'task.teacher._id': teacher_id
            }
        });
        _must.push({
            exists: {
                field: 'correct',
            }
        });
        params.query.bool.must = _must;
        options.body = JSON.stringify(params);
        const correct = await _request(options);
        const correct_number = correct.hits.total;
        // ctx.body.data.interaction = correct;
        params.query.bool.must = params.query.bool.must.slice(0, -1);
        options.body = JSON.stringify(params);
        const all = await _request(options);
        const allTotal = all.hits.total;
        // ctx.body.data.interaction = all;
        classParams.query.bool.must[0].term['task.teacher._id'] = teacher_id;
        options.body = JSON.stringify(classParams);
        const classList = await _request(options);
        // ctx.body.data.interaction = classParams
        // return
        let arr_class = [];
        for (let item of classList.hits.hits) {
            const class_id = item._source.task.class._id;
            let _must = must.map(function (value) {
                return value;
            });
            _must.push({
                term: {
                    'task.class._id': class_id
                }
            });
            _must.push({
                exists: {
                    field: 'correct',
                }
            });
            params.query.bool.must = _must;
            options.body = JSON.stringify(params);
            const correct = await _request(options);
            const correct_number = correct.hits.total;
            // ctx.body.data.interaction = correct;
            params.query.bool.must = params.query.bool.must.slice(0, -1);
            options.body = JSON.stringify(params);
            const all = await _request(options);
            const allTotal = all.hits.total;
            let correct_rate = ((correct_number / allTotal) * 100).toFixed(2);
            if (!allTotal) {
                correct_rate = 0;
            }
            arr_class.push({
                class_id: class_id,
                correct_number: correct_number,
                correct_rate: correct_rate
            });
        }
        let correct_rate = ((correct_number / allTotal) * 100).toFixed(2);
        if (!allTotal) {
            correct_rate = 0;
        }
        
        ctx.body.data.data.push({
            teacher_id: teacher_id,
            correct_number: correct_number,
            correct_rate: correct_rate,
            arr_class: arr_class
        });
    }
    const count = teacherlist.aggregations.count.value
    ctx.body.data.count = count;
    ctx.body.data.totalPage = Math.ceil(count / num);
    // ctx.body.data.interaction = body;
}

TestCtrl.teacherTaskManger = async (ctx) => {
    ctx.body = {
        errno: 0,
        errmsg: '',
        data: {}
    }
    const { class_id, start_time, end_time, cycle_type, type } = ctx.query;
    if (!class_id || !cycle_type || !type) {
        ctx.body.errmsg = '参数不全';
        return
    }
    // const classAry = class_ids.split(',');
    // let must_not = [];
    let must = [
        {
            range: {
                'task.add_time': {
                    gte: start_time,
                    lte: end_time
                }
            }
        },
        {
            term: {
                "task.type": 'homework',
            }
        },
        {
            term: {
                "task.class._id": class_id,
            }
        }
    ];
    const params = {
        query: {
            bool: {
                must: [],
                should: [],
                must_not: []
            },
        },
        aggs: {
            group_by_addTime: {
                date_histogram: {
                    script: {
                        inline: "doc['task.add_time'].value * 1000"
                    },
                    interval: cycle_type,
                    min_doc_count: 0,
                },
            }
        },
        size: 0
    };
    const options = {
        url: `http://es-cn-0pp116ay3000md3ux.public.elasticsearch.aliyuncs.com:9200/taskquestions/_search`,
        metch: 'POST',
        // body: JSON.stringify(params),
        headers: {
            "Authorization": 'Basic ZWxhc3RpYzokUmUxMjM0NTY3OA==',
            'Content-Type': 'application/json'
        }
    }
    ctx.body.data.teacherTaskManger = {};
    if (type == '批改率') {
        let ratify, all;
        must.push({
            match: {
                status: '已批改',
            }
        });
        params.query.bool.must = must;
        options.body = JSON.stringify(params);
        ratify = await _request(options);
        // ctx.body.data = ratify
        // return
        params.query.bool.must = params.query.bool.must.slice(0, -1);
        params.query.bool.should.push({
            match: {
                status: '已批改',
            }
        });
        params.query.bool.should.push({
            match: {
                status: '未批改',
            }
        });
        options.body = JSON.stringify(params);
        all = await _request(options);
        // ctx.body.data = all
        // return
        let len = all.aggregations.group_by_addTime.buckets.length;
        const ratifyBuckets = ratify.aggregations.group_by_addTime.buckets;
        const allBuckets = all.aggregations.group_by_addTime.buckets;
        let buckets = [];
        for (let i = 0; i < len; i++) {
            if (ratifyBuckets[i] && allBuckets[i].doc_count) {
                buckets.push({
                    key: allBuckets[i].key,
                    doc_count: (ratifyBuckets[i].doc_count / allBuckets[i].doc_count).toFixed(2) * 100
                });
            } else {
                buckets.push({
                    key: allBuckets[i].key,
                    doc_count: 0
                });
            }
        }
        ctx.body.data.teacherTaskManger.buckets = buckets;
    } else if (type == '布置作业次数') {
        params.aggs.group_by_addTime.aggs = {
            homework_count: {
                cardinality: {
                    field: "task.id.keyword"
                }
            }
        }
        params.query.bool.must = must;
        options.body = JSON.stringify(params);
        const body = await _request(options);
        ctx.body.data.teacherTaskManger.buckets = body.aggregations.group_by_addTime.buckets;
    }
}

TestCtrl.exerciseNumber = async (ctx) => {
    ctx.body = {
        errno: 0,
        errmsg: '',
        data: {}
    }
    let from = 0;
    let { num, page, start_time, end_time, school_id } = ctx.query;
    num = num ? num : 10;
    if (page) {
        from = (page - 1) * num;
    }
    let must = [
        {
            range: {
                'task.add_time': {
                    gte: start_time,
                    lte: end_time
                }
            }
        },
        {
            term: {
                'task.type': '',
            }
        }
    ];
    if (school_id) {
        must.push({
            term: {
                'task.school': school_id
            }
        });
        // teacherParams.query.bool.must.push({
        //     term: {
        //         'task.school': school_id
        //     }
        // });
    }
    const classParams = {
        _source: ['task.class._id', 'task.class.class_name', 'task.class.class_year', 'task.school.school_name'],
        query: {
            bool: {
                must: [],
                must_not: []
            },
        },
        aggs: {
            count: {
                cardinality: {
                    field: 'task.class._id.keyword'
                }
            }
        },
        collapse: {
            field: 'task.class._id.keyword'
        },
        sort: { 'task.school.school_name.keyword': { 'order': 'desc' }}
    }
    const params = {
        query: {
            bool: {
                must: [

                ],
                must_not: []
            },
        },
        size: 0
    }
    const options = {
        url: `${aliUrl}:9200/taskquestions/_search`,
        metch: 'POST',
        // body: JSON.stringify(params),
        headers: {
            "Authorization": 'Basic ZWxhc3RpYzokUmUxMjM0NTY3OA==',
            'Content-Type': 'application/json'
        }
    }
    // params.query.bool.must = must;
    options.body = JSON.stringify(classParams);
    const classList = await _request(options);
    // ctx.body = classList;
    // return
    const count = classList.aggregations.count.value
    ctx.body.data.count = count;
    ctx.body.data.totalPage = Math.ceil(count / num);
    ctx.body.data.data = [];
    for (let item of classList.hits.hits) {
        const class_id = item._source.task.class._id;
        const school_name = item._source.task.school.school_name;
        const class_year = item._source.task.school.class_year;
        const class_name = item._source.task.class.class_name;
        // ctx.body = item
        // return 
        must.push({
            term: {
                'task.class._id': class_id
            }
        });
        // 系统推送题量
        must[1].term['task.type'] = 'day_task';
        params.query.bool.must = must;
        options.body = JSON.stringify(params);
        const dayTask = await _request(options);
        // ctx.body.data.exerciseNumber = dayTask;
        // 作业做题数量
        must[1].term['task.type'] = 'homework';
        params.query.bool.must = must;
        options.body = JSON.stringify(params);
        const homework = await _request(options);
        // ctx.body.data.exerciseNumber = homework;
        // return
        // 自主做题题量
        must[1].term['task.type'] = 'no_task';
        params.query.bool.must = must;
        options.body = JSON.stringify(params);
        const noTask = await _request(options);
        // ctx.body.data.exerciseNumber = noTask;
        // const correctTotal = correct.hits.total;
        ctx.body.data.data.push({
            school_name: school_name,
            class_year: class_year,
            class_name: class_name,
            class_id: class_id,
            dayTask: dayTask.hits.total,
            homeworkNumber: homework.hits.total,
            nonTaskNumber: noTask.hits.total,
        })
    }
}

TestCtrl.classInformationCollect = async (ctx) => {
    ctx.body = {
        errno: 0,
        errmsg: '',
        data: {}
    }
    let from = 0;
    let { num, page, start_time, end_time, school_id } = ctx.query;
    num = num ? num : 10;
    if (page) {
        from = (page - 1) * num;
    }
    let must = [
        {
            range: {
                'task.add_time': {
                    gte: start_time,
                    lte: end_time
                }
            }
        },
        {
            term: {
                'task.type': '',
            }
        }
    ];
    if (school_id) {
        must.push({
            term: {
                'task.school': school_id
            }
        });
        teacherParams.query.bool.must.push({
            term: {
                'task.school': school_id
            }
        });
    }
    const classParams = {
        _source: ['task.class._id'],
        query: {
            bool: {
                must: [],
                must_not: []
            },
        },
        aggs: {
            count: {
                cardinality: {
                    field: 'task.class._id.keyword'
                }
            }
        },
        collapse: {
            field: 'task.class._id.keyword'
        }
    }
    const params = {
        query: {
            bool: {
                must: [

                ],
                must_not: []
            },
        },
        size: 0
    }
    const options = {
        url: `http://es-cn-0pp116ay3000md3ux.public.elasticsearch.aliyuncs.com:9200/taskquestions/_search`,
        metch: 'POST',
        // body: JSON.stringify(params),
        headers: {
            "Authorization": 'Basic ZWxhc3RpYzokUmUxMjM0NTY3OA==',
            'Content-Type': 'application/json'
        }
    }
    // params.query.bool.must = must;
    options.body = JSON.stringify(classParams);
    const classList = await _request(options);
    const count = classList.aggregations.count.value;
    ctx.body.data.count = count;
    ctx.body.data.pageSize = num;
    ctx.body.data.totalPage = Math.ceil(count / num);
    ctx.body.data.data = [];
    for (let item of classList.hits.hits) {
        const class_id = item._source.task.class._id;
        const grade = await db.collection('classes').findOne({
            '_id': mongodb.ObjectID(class_id)
        });
        console.log(grade)
        return
        must.push({
            term: {
                'task.class._id': class_id
            }
        });
        // 系统推送题量
        must[1].term['task.type'] = 'day_task';
        params.query.bool.must = must;
        options.body = JSON.stringify(params);
        const dayTask = await _request(options);
        // ctx.body.data.exerciseNumber = dayTask;
        // 作业做题数量
        must[1].term['task.type'] = 'homework';
        params.query.bool.must = must;
        options.body = JSON.stringify(params);
        const homework = await _request(options);
        // ctx.body.data.exerciseNumber = homework;
        // return
        // 自主做题题量
        must[1].term['task.type'] = 'no_task';
        params.query.bool.must = must;
        options.body = JSON.stringify(params);
        const noTask = await _request(options);
        // ctx.body.data.exerciseNumber = noTask;
        // const correctTotal = correct.hits.total;
        ctx.body.data.data.push({
            class_id: class_id,
            dayTask: dayTask.hits.total,
            homeworkNumber: homework.hits.total,
            nonTaskNumber: noTask.hits.total,
        })
    }
}

TestCtrl.arrangeHomework = async (ctx) => {
    ctx.body = {
        errno: 0,
        errmsg: '',
        data: {}
    }
    let from = 0;
    let { num, page, start_time, end_time, school_id } = ctx.query;
    num = num ? num : 10;
    if (page) {
        from = (page - 1) * num;
    }
    let must = [
        {
            range: {
                'task.add_time': {
                    gte: start_time,
                    lte: end_time
                }
            }
        },
        {
            term: {
                'task.type': 'homework',
            }
        }
    ]
    const params = {
        query: {
            bool: {
                must: []
            },
        },
        size: 1
    }
    const options = {
        url: `${aliUrl}:9200/taskquestions/_search`,
        method: 'POST',
        headers: {
            "Authorization": 'Basic ZWxhc3RpYzokUmUxMjM0NTY3OA==',
            'Content-Type': 'application/json'
        }
    }
    const tags = await db.collection('column_tag').findOne();
    const val = tags.element[1].element;
    let arr = [];
    for (let item of val) {
        for (let _itme of item.element) {
            for (let tag of _itme.element) {
                arr.push(tag.id);
            }
        }
    }
    const len = arr.length;
    const schoolParams = {};
    const teacherParams = {	
        _source: ['task.teacher._id'],	
        from: from,	
        size: num,	
        collapse: {	
            field: 'task.teacher._id.keyword'	
        },	
        aggs: {	
            count: {	
                cardinality: {	
                    field: 'task.teacher._id.keyword'	
                }	
            }	
        },	
        query: {	
            bool: {	
                must: []	
            }	
        }	
    }
    const classParams = {	
        _source: ['task.class._id'],	
        query: {	
            bool: {	
                must: [	
                    {	
                        term: {	
                            'task.teacher._id': ''	
                        }	
                    }	
                ],	
                must_not: []	
            },	
        },	
        collapse: {	
            field: 'task.class._id.keyword'	
        }	        
    }
    // const teacherParams = [
    //     {
    //         $lookup: {
    //             from: 'schools',
    //             localField: '_id',
    //             foreignField: 'school_teachers',
    //             as: 'school'
    //         }
    //     },
    //     { $limit: parseInt(num) },
    //     { $skip: from },
    //     { $sort: { 'school.school_name': -1 } },
    // ]
    // if (school_id) {
    //     teacherParams.push({
    //         $match: { 'school._id': mongodb.ObjectID(school_id) },
    //     });
    //     must.push({
    //         term: 'task.type': 'homework',
    //     })
    // }
    if (school_id) {	
        must.push({	
            term: {	
                'task.school._id': school_id	
            }	
        });	
        teacherParams.query.bool.must.push({	
            term: {	
                'task.school._id': school_id	
            }	
        });	
    }
    options.body = JSON.stringify(teacherParams);
    const teacherlist = await _request(options);
    const count = teacherlist.aggregations.count.value;
    ctx.body.data.data = [];
    for (let teacherItem of teacherlist.hits.hits) {
        const teacherId = teacherItem._source.task.teacher._id;
        let teacherArrTag = [];
        let teacherTagPro = [];
        // 5c11028878d70590cc29e7f7
        let teacherMust = must.map(function (value) {
            return value;
        });
        teacherMust.push({
            term: {
                'task.teacher._id': teacherId
            }
        });
        params.query.bool.must = teacherMust;
        options.body = JSON.stringify(params);
        const teacherAll = await _request(options);
        // ctx.body = teacherAll;
        // return
        const teacherQuestionsNumber = teacherAll.hits.total;
        // console.log(teacherId)
        // ctx.body = teacherAll;
        // return
        for (let targetId of arr) {
            let _must = teacherMust.map(function (value) {
                return value;
            });
            _must.push({
                query_string: {
                    default_field: 'Measurement_target',
                    query: `*${targetId}*`
                }
            });
            params.query.bool.must = _must;
            options.body = JSON.stringify(params);
            teacherTagPro.push(_request(Object.assign({}, options)));
        }
        const teacherTargetArr = await Promise.all(teacherTagPro);
        for (let i = 0; i < len; i++) {
            teacherArrTag.push({
                Measurement_target: arr[i],
                Measurement_target_count: teacherTargetArr[i].hits.total
            });
        }
        // return
        // 班级
        let arr_class = [];
        classParams.query.bool.must[0].term['task.teacher._id'] = teacherId
        options.body = JSON.stringify(classParams);
        const grade = await _request(options);
        // const grade = await db.collection('classes').find({
        //     'class_teacher.$id': mongodb.ObjectID(teacherId)
        // }).toArray();
        for (let item of grade.hits.hits) {
            const class_id = item._source.task.class._id;
            let obj = {};
            let classMust = must.map(function (value) {
                return value;
            });
            classMust.push({
                term: {
                    'task.class._id': class_id
                }
            });
            params.query.bool.must = classMust;
            options.body = JSON.stringify(params);
            const all = await _request(options);
            obj.class_id = class_id;
            obj.questions_number = all.hits.total;
            let tagArr = [];
            let tagPro = [];
            for (let target_id of arr) {
                let _must = classMust.map(function (value) {
                    return value;
                });
                // 5c219368e5d0c040ac2642f1
                // const class_id = item._id;
                // const class_id = '5c219368e5d0c040ac2642f1';
                // 7ad93e2ffa8e42e99c437f6ba1e65610,992af882349444058e0571ae12cafe22
                _must.push({
                    query_string: {
                        default_field: 'Measurement_target',
                        query: `*${target_id}*`
                    }
                });
                params.query.bool.must = _must;
                options.body = JSON.stringify(params);
                tagPro.push(_request(Object.assign({}, options)));
            }
            const classTargetArr = await Promise.all(tagPro);
            for (let i = 0; i < len; i++) {
                tagArr.push({
                    Measurement_target: arr[i],
                    Measurement_target_count: classTargetArr[i].hits.total
                });
            }
            obj.arr_tag = tagArr;
            arr_class.push(obj);
        }
        ctx.body.data.data.push({
            teacher_id: teacherId,
            questions_number: teacherQuestionsNumber,
            arr_tag: teacherArrTag,
            arr_class: arr_class
        });
    }
    ctx.body.data.count = count;
    ctx.body.data.totalPage = Math.ceil(count / num);
}

// const _request = (options) => {
//     return new Promise((resolve, reject) => {
//         request(options, function (err, response, body) {
//             let results = {};
//             if (err) {
//                 results.code = 0;
//                 results.msg = '引擎出错！';
//                 reject(results);
//             }
//             body = JSON.parse(body);
//             return resolve(body)
//         })
//     });
// }

module.exports = TestCtrl;
// db.getCollection('taskquestions').update({"_id": ObjectId("5c6a1c49c3be93000cc3b7b0")}, {"$set": {"question_score": 0.4}})

// http://localhost:3000/api/report/admin/taskCompleteSituation?class_id=5c219368e5d0c040ac2642f1&type=得分率&cycle_type=week