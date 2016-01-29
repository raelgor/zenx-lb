'use strict';

const co = require('co');
const http = require('http')
const assert = require('assert');
const Rule = require('./../src/Rule');
const TargetGroup = require('./../src/TargetGroup');
const LoadBalancer = require('./../src/LoadBalancer');

co(function*(){
    
    var s = [];
    
    c('started');
    
    for(let port of [10001,10002,10003,10004,10005,10006])
        s.push(yield mksv(null, port));
        
    c('created servers');
    
    var lb = new LoadBalancer({
        host: 'localhost',
        port: 10000,
        protocol: 'http',
        numOfClusters: 4,
        ws: true    
    });
    
    assert.equal(4, lb.length);
    
    c('created load balancer');
    
    yield new Promise(resolve => lb.once('listening', resolve));
    
    c('load balancer listening');
    
    var group1 = new TargetGroup({ id: 'group-1', method: 'serial' });
    
    group1.addTarget({ host: 'localhost', port: 10001 });
    group1.addTarget({ host: 'localhost', port: 10002 });
    
    yield lb.addTargetGroup(group1);
    
    assert.equal(1, lb._config.targetGroups.length);
    
    c('added target group1');
    
    var group2 = new TargetGroup({ id: 'group-2', method: 'random' });
    
    group2.addTarget({ host: 'localhost', port: 10003 });
    group2.addTarget({ host: 'localhost', port: 10004 });
    group2.addTarget({ host: 'localhost', port: 10005 });
    
    yield lb.addTargetGroup(group2);
    
    assert.equal(2, lb._config.targetGroups.length);
    
    c('added target group2');
    
    group2.addTarget({ host: 'localhost', port: 10006 });
    
    c('added target async');
    
    yield wait(1000);
    
    c('waited 1s');
    
    var rule1 = new Rule({ host: 'localhost:10000', targets: ['group-1'] });    
    
    yield lb.addRule(rule1);
    
    assert(1, lb._config.rules.length);
    
    console.log('added 1st rule');
    
    var rule2 = new Rule({ path: '/hi', targets: ['group-2'] });    
    
    yield lb.addRule(rule2);
    
    assert(2, lb._config.rules.length);
    
    console.log('added 2nd rule');
    
    c(yield get('127.0.0.1', 10000, '/hi'));
    c(yield get('127.0.0.1', 10000, '/hi'));
    c(yield get('127.0.0.1', 10000, '/hi'));
    c(yield get('127.0.0.1', 10000, '/hi'));
    c(yield get('127.0.0.1', 10000, '/hi'));
    
});

function get(host, port, path) {
    
    return new Promise(resolve => {
        
        let request = http.request({
            method: 'get',
            port,
            path,
            host,
            headers: { host: host + ':' + port }
        }, response => {
            
            let data = '';
            
            response.on('data', c => data += c);
            response.on('end', () => resolve(data));
            
        });
        
        request.end();
        
    });
    
}

function c() { console.log(...arguments); }

function wait(ms) { return new Promise(resolve => setTimeout(() => resolve(), ms)) } 

function mksv(host, port){
    return new Promise(resolve => {
        
        let s = http.createServer((req, res) => res.end(String(port)));
        
        s.listen(port, host || 'localhost');
        s.on('listening', () => resolve(s));
        s.on('error', console.log);
        
    });
}