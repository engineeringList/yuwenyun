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