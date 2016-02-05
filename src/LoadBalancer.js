'use strict';
const emitter = require('events').EventEmitter;
const co = require('co');

class LoadBalancer {
    
    constructor(options) {
        
        this.LISTENING = false;
        
        this._config = options || {};
        this.cluster = require('cluster');
        
        this._config.targetGroups = this._config.targetGroups || [];
        this._config.rules = this._config.rules || [];
        
        // Make sure certificates are strings
        if(this._config.ssl)
            for(let key of ['cert', 'key', 'ca'])
                this._config.ssl[key] = 
                   typeof this._config.ssl[key] === 'object' ? 
                   this._config.ssl[key].toString('utf8') : this._config.ssl[key];
        
        emitter.call(this);
        
        if(isNaN(this._config.numOfClusters))
            this._config.numOfClusters = 1;
        
		// Specify worker file
		this.cluster.setupMaster({ 
            exec: __dirname + '/cluster.js',
            args: ["--es_staging"] 
        });
        
        this._fillWorkerSlots().then(responses => {
            
            for(let response of responses)
                if(response.message !== 'ok')
                    return this.emit('error', { error: 'Failed to start cluster(s).' });
            
            this.emit('listening');
            
        });
        
    }
    
    addTargetGroup(targetGroupObject){
        
        this._config.targetGroups.push(targetGroupObject);
        
        if('on' in targetGroupObject)
            targetGroupObject.on('update', this._updateConfig.bind(this));
        
        return this._updateConfig();
        
    }
    
    removeTargetGroup(targetGroupObject){
        
        var index = typeof targetGroupObject === 'number' ? targetGroupObject : this._config.rules.indexOf(targetGroupObject);
        
        this._config.targetGroups.splice(index, 1);
        
        if('removeAllListeners' in targetGroupObject)
            targetGroupObject.removeAllListeners('update');
        
        return this._updateConfig();
        
    }
    
    addRule(rule) {
        
        this._config.rules.push(rule);
        
        if('on' in rule)
            rule.on('update', this._updateConfig.bind(this));
        
        return this._updateConfig();
        
    }
    
    removeRule(rule) {
        
        var index = typeof rule === 'number' ? rule : this._config.rules.indexOf(rule);
        
        this._config.rules.splice(index, 1);
        
        if('removeAllListeners' in rule)
            rule.removeAllListeners('update');
        
        return this._updateConfig();
        
    }
    
    _updateConfig() {
        return this._wrequestAll({ cmd: 'update_config', config: this._config });
    }
    
    _wrequestAll(requestObject) {
        
        var workerRequests = [];
        
        for(let workerKey in this.cluster.workers)
            this._wrequest(
                this.cluster.workers[workerKey], 
                requestObject);
        
        return Promise.all(workerRequests);
        
    }
    
    _wrequest(worker, requestObject) {
        
        var resolve;
        
        var request = {
            requestId: ++worker._rid || (worker._rid = 1),
            requestObject
        }
        
        var listener = message => {
            if(message.requestId === request.requestId) {
                worker.removeListener('message', listener);
                resolve(message);
            }
        }
            
        worker.on('message', listener);
        worker.send(request);
        
        return new Promise(r => resolve = r);
        
    }
    
    // Forks workers until we have as many 
    // as this._config.numOfClusters
	_fillWorkerSlots() {
        
        var pendingRequests = []
        
		while(this.length < this._config.numOfClusters) { 
            
            let worker = this.cluster.fork();
			
            worker.on('message', this._messageHandler);
            
            worker.send({ cmd: 'init', options: this._config });
            
            pendingRequests
                .push(new Promise(
                        resolve => 
                            worker.once('listening', () => resolve({ message: 'ok' })))); 
            
        }
        
        if(!pendingRequests.length)
            pendingRequests.push(Promise.resolve({ message: 'ok' }));
            
        return Promise.all(pendingRequests);
		
	}
    
    get length() {
        return Object.keys(this.cluster.workers).length;
    }
    
    _messageHandler(message) {
        
        // This message probably has its
        // own handler so we're gonna exit
        if('requestId' in message)
            return;
        
        if(message.cmd === 'event')
            this.emit(message.event, message.data);
    
    }
    
    close() {
        for(let worker of this.cluster.workers)
            worker.kill('SIGTERM');
        this.emit('close');
    }
    
}

LoadBalancer.prototype.__proto__ = emitter.prototype;

module.exports = LoadBalancer;