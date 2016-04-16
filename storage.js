// options
var options = require('./config/settings.js').options;
var fs = require('fs');
var gmap = require('./lib/gmap.node');

// lod & def
console.log('load lod and defs');
var lod = fs.readFileSync(__dirname + '/map/lod.json', 'utf-8');
var defs = {};
for (var def = 0; def < options.vtConfig.length; ++def) {
    var confName = options.vtConfig[def];
    defs[confName] = fs.readFileSync(__dirname + '/map/' + confName + '.json', 'utf-8');
};

// Init log
console.log("log level: " + options.logLevel || 6);
gmap.initLog(options.logLevel || 6);//, __dirname + '/log');

// data source pool
console.log("Connect SQL datasource " + options.osmConn.url + " ...");
gmap.registerPool(options.osmConn.name, options.osmConn.url, options.osmConn.initialConnSize, options.osmConn.maxConnSize, "PG");

// seaweed storage
console.log("Resgist weed storage " + options.weed.host + ":" + options.weed.port + " ...")
gmap.registerStorage(options.weed.host, options.weed.port);

function _getVtPath(name, z, x, y) {
    return '/' + name + '/' + z + '/' + x + '/' + y + '/.pb';
}

function getVectorTile(req, res, next) {
    var params = req.params;

    var name = params.name || 'vt_base';
    if (!defs.hasOwnProperty(name)) {
        console.log('No vt configure named: ' + name);
        return next(new restify.InternalServerError('map name error!'));
    }

    var z = parseInt(params.z) || 0;
    var x = parseInt(params.x) || 0;
    var y = parseInt(params.y) || 0;
    var vtPath = _getVtPath(name, z, x, y);
    console.log('Get vector-tile at ' + vtPath);
    
    gmap.getFile(vtPath, function(err, data) {
        console.log('gmap.getFile result: ' + err);
        err = err || !data || data.length == 0;

        if (err) {
            console.log('regenerate tile...');
            var opts = {
                mapDir: options.mapDir,
                lod: lod,
                style: defs[name],
                fromFile: false,
                renderType: 2, // render vector tile
                z: z,
                x: x,
                y: y,
                bufferSize: 32,
                renderLabel: true,
                saveCloud: true,
                tileURL: vtPath,
                name: name
            };
            gmap.tile(opts, function(err, stream) {
                if (err) {
                    return next(new restify.InternalServerError('render tile fail!'));
                } else {
                    console.log('regenerate tile success. file size: ' + stream.length);
                    res.end(stream, 'binary');
                }
            });
        } else {
            console.log('get tile success. file size: ' + data.length);
            res.end(data, 'binary');
        }
    });
}

exports.getVectorTile = getVectorTile;
