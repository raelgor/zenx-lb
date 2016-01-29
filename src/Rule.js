'use strict';
const emitter = require('events').EventEmitter;

class Rule {
    
    constructor(options) {
        
        emitter.call(this);
        var targetIndex = 0;
        
        for(let key in options)
            this[key] = options[key];
        
        this.getNextTarget = () => {
            
            if(!(++targetIndex in this.targets))
                targetIndex = 0;
            
            return this.targets[targetIndex];
            
        }
        
    }
    
    update() {
        this.emit('update');
    }
    
}

Rule.prototype.__proto__ = emitter.prototype;
module.exports = Rule;