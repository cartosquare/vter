var options = require('./config/settings.js').options;
var storage = require('./storage.js');

// REST服务
var restify = require('restify');

var server = restify.createServer();
exports.startServer = function(port, callback) {
    console.log('listening on port ' + (port ? port : options.port));
    server.listen(port ? port : options.port, callback);
};
exports.stopServer = function(callback) {
    server.close(callback);
};

server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.CORS());
server.use(restify.fullResponse());

// 返回服务的版本号
var packageJson = require('./package.json');

server.get('/info', function(req, res, next) {
    res.send({
        version: packageJson.version
    });
    next();
});

server.get('/vector-tile/:name/:z/:x/:y', storage.getVectorTile);
