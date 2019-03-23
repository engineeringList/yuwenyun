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