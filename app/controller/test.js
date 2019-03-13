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
            match: {
                policy: 1,
            }
        },
        {
            match: {
                "task.type": "homework",
            }
        },
        // {
        //     match: {
        //         'task.teacher._id': '12'                           
        //     }
        // }
    ]
    const params = {
        query: {
            bool: {
                must: []
            },
        },
        aggs: {
            group_by_addTime: {
                date_histogram: {
                    field: 'task.add_time',
                    interval: cycle_type
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
    for (let teacher_id of teacherAry) {
        let _must = must.map(function(value){
            return value;  
        })
        _must.push({
            match: {
                'task.teacher._id': teacher_id
            }
        })
        params.query.bool.must = _must
        options.body = JSON.stringify(params);
        const body = await _request(options);
        ctx.body.data.correct.push({
            teacher_id: teacher_id,
            buckets: body.aggregations.group_by_addTime.buckets
        })

        // console.log(body)
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
    //                     match: {
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