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