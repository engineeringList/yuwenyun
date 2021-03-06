'use strict';

const Koa = require('koa');
const app = new Koa();

const morgan = require('koa-morgan');
// log
app.use(morgan('dev'));

const router = require('./app/router');
app.use(router.routes());

// var elasticsearch = require('elasticsearch');
// var client = new elasticsearch.Client({
//   host: [
//     {
//       host: 'es-cn-0pp116ay3000md3ux.public.elasticsearch.aliyuncs.com',
//       auth: 'elastic:$Re12345678',
//       port: 9200
//     }
//   ]
// });

// client.ping({
//   // ping usually has a 3000ms timeout
//   requestTimeout: 1000
// }, function (error) {
//   if (error) {
//     console.trace('elasticsearch cluster is down!');
//   } else {
//     console.log('All is well');
//   }
// });

// global.client = client;
// var utils = require('mongoose-dbref').utils;
// var mongoose = require("mongoose");
// var db = `mongodb://dds-uf6338efc0fe68741988-pub.mongodb.rds.aliyuncs.com:3717/yuwenyun?authSource=admin`
// // 连接
// const Db = mongoose.connect(db, { user: 'root', pass: 'huangkai123!@#', useNewUrlParser: true });

// var connection = mongoose.connection;
// connection.on('connected', function () {
//   console.log('Mongoose 连接成功');
// })

// connection.on('error', function (error) {
//   console.log(error);
// })
// connection.once('open', function (callback) {
//   let school = mongoose.model('schools', new mongoose.Schema({
//     school_memo: String,
//     school_classess: [{ 
//       $ref: String,
//       $id: String,
//       $db: String
//     }],
//   }));
//   mongoose.set('debug', true);
  // let Classes = mongoose.model('Classes', new mongoose.Schema({
  //   class_name: String
  // }));
  // .populate('school_classess')
  // let teacher = mongoose.model('teachers', new mongoose.Schema({}));
  // school.find({}).limit(1).skip(1).exec(function (err, docs) {
    // console.log(docs.school_classess[0])
    // utils.fetch(Db, docs.school_classess[0],
    //   function (err, doc) {
    //     if (err) throw err;
    //     console.log("Order = " + doc);
    //   });
  // })
  // Classes.find({}).exec(function(err,docs){
  //    console.log(docs[0])
  // })
  // let a = new tq({ name: '古诗文默写《 沁园春·长沙》' })
  // // a.save()
  // tq.find({ name: '古诗文默写《 沁园春·长沙》' }, function (err, d) {
  //   console.log(d)
  // })
  // console.log('数据库启动了');
  // app.listen(3000, () => {
  //   console.log('starting at port 3000');
  // });
  // app.listen(8080, () => console.log('Express server listening on port 8080'));
// })

require('./app/lib/sync.js').changeStream()



// var db = mongoose.connect("mongodb://root:huangkai123!@#@dds-uf6338efc0fe68741988-pub.mongodb.rds.aliyuncs.com:3717/yuwenyun?authSource=yuwenyun"); 

// db.connection.on("error", function (error) {  
//   console.log("数据库连接失败：" + error); 
// }); 

// db.connection.on("open", function () {  
//   console.log("数据库连接成功");
// });

var mongoUtil = require('./app/lib/mongoUtil');

mongoUtil.connectToServer( function( err ) {
  app.listen(3000, () => {
    console.log('starting at port 3000');
  });
} );
