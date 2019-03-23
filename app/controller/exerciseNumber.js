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
        size: num,
        from: from,
        sort: [
            { 'task.school.school_name.keyword': { 'order': 'desc' }},
            { 'task.class.class_name.keyword': { 'order': 'asc' }},
        ]
    }
    if (school_id) {
        must.push({
            term: {
                'task.school._id': school_id
            }
        });
        classParams.query.bool.must.push({
            term: {
                'task.school._id': school_id
            }
        });
    }
    const params = {
        query: {
            bool: {
                must: [

                ],
                must_not: []
            },
        },
        size: 1
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
        let _must = must.map(function (value) {
            return value;
        });
        _must.push({
            term: {
                'task.class._id': class_id
            }
        });
        // 系统推送题量
        _must[1].term['task.type'] = 'day_task';
        params.query.bool.must = _must;
        options.body = JSON.stringify(params);
        const dayTask = await _request(options);
        // ctx.body.data.data = dayTask;
        // return
        // 作业做题数量
        _must[1].term['task.type'] = 'homework';
        params.query.bool.must = _must;
        options.body = JSON.stringify(params);
        const homework = await _request(options);
        // ctx.body.data.data = params;
        // return
        // 自主做题题量
        _must[1].term['task.type'] = 'non_task';
        params.query.bool.must = _must;
        options.body = JSON.stringify(params);
        const noTask = await _request(options);
        // ctx.body = params
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