const request = require('request');

module.exports = (options) => {
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