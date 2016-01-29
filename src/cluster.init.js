/* global config */
'use strict';

const httpProxy = require('http-proxy');
const url = require('url');

var proxy = httpProxy.createProxyServer({ xfwd: true });

function init(message) {
    
    var config = global.config = message.options;
    
    var serverOptions = 
        config.ssl ? [config.ssl, _reqHandler] : [_reqHandler];
    
    var server = require(config.protocol)
                    .createServer(...serverOptions);
                    
    server.listen(config.port, config.host);
    
    server.on('listening', () => 
            process.send({ cmd: 'event', event: 'listening' }));

    if(config.ws)
        server.on('upgrade', (req, socket, head) => {
            
            let target = getProxyTarget(req, true, socket.close.bind(socket));
            proxy.ws(req, socket, head, { target });
            
        }); 
    
}

function _reqHandler(req, res) {
    
    var target = getProxyTarget(req, false, res.end.bind(res));
    
    if(!target) {
        res.statusCode = 404;
        res.end('404: Not found');
        return;
    }
    
    proxy.web(req, res, { target });
    
}

function getTargetGroupById(id){
    return config.targetGroups.filter(group => { return group.id === id })[0];
}

function getProxyTarget(request, isWs, end) {
    
    var host = request.headers.host;
    var urlInfo = url.parse(request.url);
    
    var targetGroup;
    var target;
    
    for(let rule of config.rules) {
        
        let passed = true;
        
        if('host' in rule && host !== rule.host) passed = false;
        if('path' in rule && urlInfo.pathname !== rule.path) passed = false;
        
        if(passed) {
            targetGroup = getTargetGroupById(rule.getNextTarget());
            break;
        }
        
    }
    
    if(!targetGroup)
        return end();
    
    target = targetGroup.getNextTarget();
    
    var targetUrl = 
        (target.protocol || 'http') + '://' +
        target.host + ':' +
        target.port;
        
    return targetUrl;
        
}

module.exports = init;