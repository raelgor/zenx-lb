'use strict';
const emitter = require('events').EventEmitter;

class TargetGroup {
    
    constructor(options) {
        
        emitter.call(this);
        this.id = options.id;
        this.method = options.method;
        this.targets = options.targets || [];
        
    }
    
    addTarget(target) {
        
        this.targets.push(target);
        this.emit('update');
        
    }
    
    removeTarget(target){
        
        var index = target;
        
        if(typeof target === 'object')
            index = this.targets.indexOf(target);
            
        this.targets.splice(index, 1);
        
        this.emit('update');
        
    }
    
    getNextTarget() {
        
        var target;
        
        if(this.method === 'random')
            target = this.targets[Math.floor(Math.random() * this.targets.length)];
            
        if(this.method === 'serial') {
            
            if(isNaN(this._targetIndex) || !(++this._targetIndex in this.targets)) 
                this._targetIndex = 0;
            
            target = this.targets[this._targetIndex];
        
        }
        
        if(typeof this.method === 'function')
            target = this.method();
        
        return target;
        
    }
    
}

TargetGroup.prototype.__proto__ = emitter.prototype;
module.exports = TargetGroup;