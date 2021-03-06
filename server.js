const http = require("http");
const fs = require('fs');
const WebSocketServer = require('websocket').server;

const pjs = JSON.parse(fs.readFileSync('package.json')).pjs;

const host = process.env.app_host || pjs.app_host || 'localhost';
const port = process.env.app_port || pjs.app_port || 5000;
const mimeType = pjs.mime || {
    "html": "text/html",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "svg": "image/svg+xml",
    "json": "application/json",
    "js": "text/javascript",
    "pjs": "text/javascript",
    "css": "text/css",
    "txt": "text/txt"
};

const ImageCacheControl = pjs.image_cache || 1800;
const API = {};

function parseParams(params) {
    if (params) {
        params = params.split('&');
    } else { return undefined; }
    const out = {};

    params.forEach(e => {
        out[e.split('=')[0]] = e.split('=')[1];
    });

    return out;
}

function ReadAllDirs(dir) {
    let files = [];
    const rd = fs.readdirSync(dir);
    for (const f of rd) {
        if (f.endsWith('.pjs')) {
            files.push(dir + f);
        } else {
            files = files.concat(ReadAllDirs(dir + f + '/'));
        }
    }
    return files;
}

const requestListener = (req, res) => {
    req.params = parseParams(req.url.split('?')[1]);
    req.url = req.url.split('?')[0];
    if (req.url in API) {
        res.__headers = {};
        res.setHeader = (header, value) => {
            res.__headers[header] = value;
            return res;
        };
        res.status = (status) => res.writeHead(status, res.__headers);
        res.json = (json) => res.end(JSON.stringify(json));
        res.text = (text) => res.end(text);

        return API[req.url](req, res);
    } else if (req.url.indexOf('/api') == 0) {
        let result = undefined;
        for (const ep of Object.keys(API)) {
            if (ep.indexOf('[') != -1) {
                const rep = ep.replace(/ *\[[^\]]*]/g, '');
                const regex = new RegExp(rep.replace('//', '/(.+)+/'), 'g');
                console.log(regex);
                if (regex.test(req.url)) {
                    result = ep;
                    break;
                }
            }
        }
        if (result) {
            req.placeholders = {};

            let i = 0;
            result.split('/').forEach(r => {
                if (r.indexOf('[') != -1) {
                    req.placeholders[r.substr(1, r.length-2)] = req.url.split('/')[i];
                }
                i++;
            });

            req.url = result;
            return requestListener(req, res);
        }
    }

    if (req.url == '/') {
        req.url = '/index.html';
    }
    const original = req.url;
    if (original.indexOf('server.js') != -1 ||
        original.indexOf('package.json') != -1 ||
        original.indexOf('package-lock.json') != -1) {
        res.writeHead(403);
        return res.end("403 Forbidden" || pjs.forbidden_response);
    }
    if (!fs.existsSync(__dirname + req.url)) {
        req.url = '/public' + original;
    }
    if (!fs.existsSync(__dirname + req.url)) {
        req.url = '/src' + original;
    }
    fs.readFile(__dirname + req.url, (err, data) => {
        if (err) {
            req.url = '/';
            return requestListener(req, res);
        }
        const mime = mimeType[req.url.split('.').pop()];
        if (mime) {
            let cachecontrol = {};
            if (mime.indexOf('image') != -1) {
                cachecontrol['Cache-Control'] = `max-age=${ImageCacheControl}`;
            }
            res.writeHead(200, {"Content-Type": mime, ...cachecontrol});
        } else {
            res.writeHead(200);
        }
        if (req.url.endsWith('.pjs') && pjs.server_parser) {
            data = data.replace(/\([ \r\n]+</g, '`<').replace(/>[ \r\n]+\)/g, '>`');
        }
        res.end(data);
    });
};

const server = http.createServer(requestListener);
if (pjs.live_reload) new WebSocketServer({ httpServer: server, autoAcceptConnections: true });

if (pjs.api_enabled) {
    const routes = ReadAllDirs('src/api/');
    for (const _r of routes) {
        const route = _r.substr(3, _r.length - 7);
        API[route] = require('./' + _r);
    }
}

server.listen(port, host, () => {
    console.log(`\x1b[36m[pjs] Server running at \x1b[0m\x1b[4mhttp://${host}:${port}\x1b[0m`);
});