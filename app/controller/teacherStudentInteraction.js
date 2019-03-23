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
            term: {
                'status.keyword': '已批改',
            }
        },
        {
            term: {
                policy: 1,
            }
        },
    ]
    const teacherParams = {
        _source: ['task.teacher', 'task.school.school_name'],
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
        const teacher_name = item._source.task.teacher.name;
        // console.log(item._source.task)
        const school_name = item._source.task.school.school_name
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
        // ctx.body.data.data = all;
        // return
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
            teacher_name: teacher_name,
            school_name: school_name,
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