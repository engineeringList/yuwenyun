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