'use strict';

const Router = require('koa-router');

const router = new Router();

require('./test')(router);

module.exports = router;