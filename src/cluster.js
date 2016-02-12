'use strict';

const http = require('http');
const https = require('https');
const Rule = require('./Rule');
const TargetGroup = require('./TargetGroup');

process.title = 'zenx-lb-c';

const command = {
    
    // Takes in a configuration object
    // and starts the server
    init: require('./cluster.init'),
    
    update_config: message => {
        
        global.config = message.requestObject.config;
        
        for(let item in global.config.targetGroups)
            global.config.targetGroups[item] = new TargetGroup(global.config.targetGroups[item])
        
        for(let item in global.config.rules)
            global.config.rules[item] = new Rule(global.config.rules[item]);
        
        process.send({ requestId: message.requestId, message: 'ok' });
        
    }
    
}

function _messageHandler(message) {
    command[message.cmd || message.requestObject.cmd](message);
}

process.on('message', _messageHandler);