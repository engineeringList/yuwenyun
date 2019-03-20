var MongoClient = require('mongodb').MongoClient;
var uri = `mongodb://root:huangkai123!%40#@dds-uf6338efc0fe68741988-pub.mongodb.rds.aliyuncs.com:3717/yuwenyun?authSource=admin`;

var _db;

module.exports = {
  connectToServer: function( callback ) {
    // MongoClient.connect(uri, { useNewUrlParser: true }).then(client => {
    //   _db = client.db('yuwenyun');
    //   return callback()
    // });
    MongoClient.connect(uri, { useNewUrlParser: true }, function(err, client) {
      _db = client.db('yuwenyun');
      return callback( err );
    })
  },

  getDb: function() {
    console.log(_db)
    return _db;
  }
};