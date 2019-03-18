'use strict';

const TestCtrl = {};
const _request = require('../lib/req');

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
        },
        // {
        //     term: {
        //         'task.teacher._id': '12'                           
        //     }
        // }
    ]
    const params = {
        // _source: ["status", "test1"],
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
                    // format: 'yyyy-MM-dd HH',
                    min_doc_count: 0,
                }
                // {
                //     field: 'task.add_time',
                //     interval: cycle_type,
                //     // format: 'yyyy-MM-dd',
                //     min_doc_count: 0,
                //     // "offset": "+1m"
                //     // keyed: true
                // },
            }
        },
        // script_fields: {
        //     "add_time": {
        //         "script": {
        //             "lang": "painless",
        //             "source": "doc['task.add_time'].value * 1000"
        //         }
        //     },
        // },
        // "script_fields" : {
        //     "test1" : {
        //         "script" : "params['_source']['task.add_time']"
        //     }
        // },
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
    ctx.body.data.correct = [];
    if (type == '手工批改数') {
        must.push({
            match: {
                status: "已批改",
            }
        });
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
            ctx.body.data.correct.push({
                teacher_id: teacher_id,
                buckets: body.aggregations.group_by_addTime.buckets
                // buckets: body
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
                match: {
                    status: '已批改',
                }
            });
            params.query.bool.must = _must;
            options.body = JSON.stringify(params);
            ratify = await _request(options);
            // 提交总数
            params.query.bool.must = params.query.bool.must.slice(0, -1);
            params.query.bool.must_not.push({
                match: {
                    status: '未答题',
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
                // console.log(ratifyBuckets[i].doc_count)
                // console.log(allBuckets[i].doc_count)
                if (ratifyBuckets[i] && allBuckets[i].doc_count) {
                    buckets.push({
                        key: allBuckets[i].key,
                        doc_count: (ratifyBuckets[i].doc_count / allBuckets[i].doc_count).toFixed(2)
                    });
                } else {
                    buckets.push({
                        key: allBuckets[i].key,
                        doc_count: '0.00'
                    });
                }
                // ratifyBuckets[i].doc_count = ratifyBuckets[i] ? ratifyBuckets[i].doc_count : 0;
                // allBuckets[i].doc_count = allBuckets[i] ? allBuckets[i].doc_count : 0;
            }
            ctx.body.data.correct.push({
                teacher_id: teacher_id,
                buckets: buckets
            })
        }
        // ctx.body.data.correct = ratify.aggregations.group_by_addTime.buckets
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
                match: {
                    status: '已批改',
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
                        doc_count: (commentBuckets[i].doc_count / allBuckets[i].doc_count).toFixed(2)
                    });
                } else {
                    buckets.push({
                        key: allBuckets[i].key,
                        doc_count: '0.00'
                    });
                }
            }
            ctx.body.data.correct.push({
                teacher_id: teacher_id,
                buckets: buckets
            });
        }
    }

    // const body = await _request(options)
    // ctx.body = body;
    // const response = await client.search({
    //     index: 'yuwenyun',
    //     body: {
    //         query: {
    //             bool: {
    //                 must: [{
    //                     range: {
    //                         add_time: {
    //                             gte: 1550457918,
    //                             lte: 1550457938
    //                         }
    //                     }
    //                 },
    //                 {
    //                     term: {
    //                         policy: 1
    //                     }
    //                 }]
    //             }
    //         },
    //         aggs: {
    //             group_by_addTime: {
    //                 date_histogram: {
    //                     field: "add_time",
    //                     interval: "month"
    //                 },
    //             }
    //         }
    //     },
    //     size: 10
    // });
    // const a = await client.create({
    //     index: 'yuwenyun',
    //     type: 'taskquestions',
    //     id: '1',
    //     body: {
    //         teacher_id: '1',
    //         student_id: '1',
    //         question_id: 1,
    //         taskType: 'homework',
    //         add_time: 1550457929,
    //         policy: 1,
    //         status: '已批改'
    //     }
    // });
    // const a = await client.deleteByQuery({
    //     index: '.monitoring-es-6-2019.03.07',
    //     q: ''
    // });
    // console.log(a)
    // console.log(response)
    // console.log(response.hits.hits)
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
                    field: 'task.add_time',
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
    ctx.body.data.class = [];
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
                match: {
                    status: '已批改',
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
                match: {
                    status: '未答题',
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
                        doc_count: (ratifyBuckets[i].doc_count / allBuckets[i].doc_count).toFixed(2)
                    });
                } else {
                    buckets.push({
                        key: allBuckets[i].key,
                        doc_count: '0.00'
                    });
                }
            }
            ctx.body.data.class.push({
                class_id: class_id,
                buckets: buckets
            })
        }
    } else if (type == '布置作业次数') {
        params.aggs.group_by_addTime.aggs = {
            homework_count: {
                cardinality: {
                    field: "task.id.keyword"
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
            ctx.body.data.class.push({
                class_id: class_id,
                buckets: body.aggregations.group_by_addTime.buckets
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
                    field: 'task.add_time',
                    interval: cycle_type,
                    min_doc_count: 0
                }
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
    ctx.body.data.correct = [];
    if (type == '布置作业次数') {
        params.aggs.group_by_addTime.aggs = {
            homework_count: {
                cardinality: {
                    field: "task.id.keyword"
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
        ctx.body.data.count.push({
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
                "task.type": "homework",
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
        url: `http://es-cn-0pp116ay3000md3ux.public.elasticsearch.aliyuncs.com:9200/taskquestions/_search`,
        metch: 'POST',
        // body: JSON.stringify(params),
        headers: {
            "Authorization": 'Basic ZWxhc3RpYzokUmUxMjM0NTY3OA==',
            'Content-Type': 'application/json'
        }
    }
    ctx.body.data.column = [];
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
    const total = all.hits.total;
    for (let tag of column_tag) {
        let _must = must.map(function (value) {
            return value;
        });
        _must.push({
            match: {
                column_tag: tag.id
            }
        })
        params.query.bool.must = _must;
        options.body = JSON.stringify(params);
        const body = await _request(options);
        // ctx.body.data.column = body
        tag.doc_count = (body.hits.total / total).toFixed(2);
        // ctx.body.data.correct = params
        ctx.body.data.column.push(tag);
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
                    field: 'task.add_time',
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
    ctx.body.data.learningReport = [];
    if (type == 'person') {
        must.push({
            term: {
                "task.student._id": params_id,
            }
        })
        params.query.bool.must = must;
        options.body = JSON.stringify(params);
        const body = await _request(options);
        ctx.body.data.learningReport = body.aggregations.group_by_addTime.buckets;
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
            ctx.body.data.learningReport.push({
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
                event: 'LONGIN'
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
        url: `http://es-cn-0pp116ay3000md3ux.public.elasticsearch.aliyuncs.com:9200/yuwenyun/taskquestions/_search`,
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
            match: {
                status: '未答题',
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
                    doc_count: (submitBuckets[i].doc_count / allBuckets[i].doc_count).toFixed(2) * 100
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
                    }, 
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

TestCtrl.teacherStudentInteraction = async (ctx) => {
    ctx.body = {
        errno: 0,
        errmsg: '',
        data: {}
    }
    let from = 0;
    let { num, page, start_time, end_time, school_id } = ctx.query;
    if (num) {
        num = num ? num : 0;
    }
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
        url: `http://es-cn-0pp116ay3000md3ux.public.elasticsearch.aliyuncs.com:9200/taskquestions/_search`,
        metch: 'POST',
        // body: JSON.stringify(params),
        headers: {
            "Authorization": 'Basic ZWxhc3RpYzokUmUxMjM0NTY3OA==',
            'Content-Type': 'application/json'
        }
    }
    ctx.body.data.interaction = [];
    // params.query.bool.must = must;
    options.body = JSON.stringify(teacherParams);
    const teacherlist = await _request(options);
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
        const correctTotal = correct.hits.total;
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
            const correctTotal = correct.hits.total;
            // ctx.body.data.interaction = correct;
            params.query.bool.must = params.query.bool.must.slice(0, -1);
            options.body = JSON.stringify(params);
            const all = await _request(options);
            const allTotal = all.hits.total;
            let correct_prob = (correctTotal / allTotal).toFixed(2) * 100;
            if (!allTotal) {
                correct_prob = 0;
            }
            arr_class.push({
                class_id: class_id,
                correct: correctTotal,
                correct_prob: correct_prob
            });
        }
        let correct_prob = (correctTotal / allTotal).toFixed(2) * 100;
        if (!allTotal) {
            correct_prob = 0;
        }
        const count = teacherlist.aggregations.count.value
        ctx.body.data.count = count;
        ctx.body.data.totalPage = Math.ceil(count / num);

        ctx.body.data.interaction.push({
            teacher_id: teacher_id,
            correct: correctTotal,
            correct_prob: correct_prob,
            arr_class: arr_class
        });
    }
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
    const count = classList.aggregations.count.value
    ctx.body.data.count = count;
    ctx.body.data.totalPage = Math.ceil(count / num);
    ctx.body.data.data = [];
    for (let item of classList.hits.hits) {
        const class_id = item._source.task.class._id;
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
    const count = classList.aggregations.count.value
    ctx.body.data.count = count;
    ctx.body.data.totalPage = Math.ceil(count / num);
    ctx.body.data.data = [];
    for (let item of classList.hits.hits) {
        const class_id = item._source.task.class._id;
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
    if (num) {
        num = num ? num : 0;
    }
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
    }
    const options = {
        url: `http://es-cn-0pp116ay3000md3ux.public.elasticsearch.aliyuncs.com:9200/column_tag/_search`,
        method: 'POST',
        headers: {
            "Authorization": 'Basic ZWxhc3RpYzokUmUxMjM0NTY3OA==',
            'Content-Type': 'application/json'
        }
    }
    options.body = JSON.stringify(params);
    const tags = await _request(options);
    const val = tags.hits.hits[0]._source.element[1].element;
    let arr = [];
    for (let item of val) {
        for (let _itme of item.element) {
            for (let tag of _itme.element) {
                arr.push(tag.id);
            }
        }
    }
    const url = `http://es-cn-0pp116ay3000md3ux.public.elasticsearch.aliyuncs.com:9200/taskquestions/_search`;
    options.url = url;
    options.size = 1;
    ctx.body.data.interaction = [];
    options.body = JSON.stringify(teacherParams);
    const teacherlist = await _request(options);
    ctx.body.data.data = [];
    let Measurement_target = [];
    for (let target_id of arr) {
        for (let teacherItem of teacherlist.hits.hits) {
            const teacher_id = teacherItem._source.task.teacher._id;
            let _must = must.map(function (value) {
                return value;
            });
            _must.push({
                term: {
                    'task.teacher._id': teacher_id
                }
            });
            _must.push({
                match: {
                    Measurement_target: target_id,
                }
            });
            params.query.bool.must = _must;
            options.body = JSON.stringify(params);
            const target = await _request(options);
            Measurement_target.push({
                id: target_id,
                count: target.hits.total
            });
            classParams.query.bool.must[0].term['task.teacher._id'] = teacher_id;
            options.body = JSON.stringify(classParams);
            const classList = await _request(options);
            let arr_class = [];
            // for (let item of classList.hits.hits) {
            //     const class_id = item._source.task.class._id;
            //     let _must = must.map(function (value) {
            //         return value;
            //     });
            //     _must.push({
            //         term: {
            //             'task.class._id': class_id
            //         }
            //     });
            //     _must.push({
            //         match: {
            //             Measurement_target: target_id,
            //         }
            //     });
            //     params.query.bool.must = _must;
            //     options.body = JSON.stringify(params);
            //     const classTarget = await _request(options);
            //     const classTargetTotal = classTarget.hits.total;
            //     arr_class.push({
            //         class_id: class_id,
            //         classTargetTotal: classTargetTotal,
            //     });
            // }
            const count = teacherlist.aggregations.count.value;
            ctx.body.data.count = count;
            ctx.body.data.totalPage = Math.ceil(count / num);
            ctx.body.data.data.push({
                teacher_id: teacher_id,
                // questions_number: 1,
                Measurement_target: Measurement_target,
                arr_class: arr_class
            });
        }
    }

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