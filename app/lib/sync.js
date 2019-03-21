var MongoClient = require('mongodb').MongoClient;
var uri = `mongodb://root:huangkai123!%40#@dds-uf6338efc0fe68741988-pub.mongodb.rds.aliyuncs.com:3717/yuwenyun?authSource=admin`
const request = require('./req');

module.exports = {
	changeStream: function () {
		MongoClient.connect(uri, { useNewUrlParser: true }).then(
			function (client) {
				console.log('Ready to watch database');
				let db = client.db('yuwenyun');
				global.db = db;
				let streams = db.collection('taskquestions').watch([
					{
						$match: {
							$or: [
								{
									operationType: 'update'
								},
								{
									operationType: 'insert'
								}
							]
						}
					}
				]);
				streams.on('change', function (change) {
					console.log('>>>>>taskquestions changed<<<<<');
					// console.log(change);
					const { _id } = change.documentKey;
					db
						.collection('taskquestions')
						.findOne({ _id: _id }, async (err, res) => {
							delete res._id;
							// delete res.question_id;
							// console.log(res)
							const { question_type, question_item } = res;
							let total_score = 0;
							if (res.question_type == '选择题') {
								total_score = Math.max.apply(Math, question_item.map(item => {return item.score}));
							} else {
								question_item.forEach(item => {
									total_score = total_score + item.score;
								});
							}
							res.total_score = total_score;
							const options = {
								url: `http://es-cn-0pp116ay3000md3ux.public.elasticsearch.aliyuncs.com:9200/taskquestions/taskquestions/${_id}`,
								method: 'POST',
								headers: {
									"Authorization": 'Basic ZWxhc3RpYzokUmUxMjM0NTY3OA==',
									'Content-Type': 'application/json'
								},
								body: JSON.stringify(res)

							};
							const d = await request(options);
							console.log(d)
						});
				});
			}
		);
	}
};
