'use strict';

const TestCtrl = {};
const request = require('request');

// let username = 'elastic'
// let password = 'Re12345678'
// let auth = "Basic " + new Buffer(username + ":" + password).toString("base64")

TestCtrl.index = async (ctx) => {
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
        }
        // size: 10
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
            params.query.bool.must = params.query.bool.must.slice(0,-1);
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
            params.query.bool.must = params.query.bool.must.slice(0,-1);
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

const _request = (options) => {
    return new Promise((resolve, reject) => {
        request(options, function (err, response, body) {
            let results = {};
            if (err) {
                results.code = 0;
                results.msg = '引擎出错！';
                reject(results);
            }
            body = JSON.parse(body);
            return resolve(body)
        })
    });
}

module.exports = TestCtrl;