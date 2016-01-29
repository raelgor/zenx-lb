'use strict';

const PORT_MAX = 8110;
const PORT_MIN = 8100;
const LB_ADDR = 'localhost';
const LB_PORT = 10001;
const LB_PROTOCOL = 'http';
const TEST_SERVER_ADDR = 'localhost';
const REQUEST_PATH = '/test/path';

const ws = require('ws');
const assert = require('assert');
const http = require('http');
const co = require('co');

describe('Server test', () => {
    
    let lib;
    let LoadBalancer;
    let TargetGroup;
    let server;
    let targetGroup;
    let lbPath = LB_PROTOCOL + '://' + LB_ADDR + ':' + LB_PORT;
    let targets = [];
    
    for(let port = PORT_MIN; port < PORT_MAX; port++)
        targets.push({ port, host: 'localhost', protocol: 'http' });
        
    it('should load module without errors', 
        () => {
            lib = require('..');
            LoadBalancer = lib.LoadBalancer;
            TargetGroup = lib.TargetGroup;
        });
        
    it('should create a target group', 
        () => targetGroup = new TargetGroup({
            id: 'group-1',
            method: 'random', // random, serial, function
            targets
        }));
    
    it('should create a server without errors', 
        () => server = new LoadBalancer({
            protocol: LB_PROTOCOL,
            port: LB_PORT,
            host: LB_ADDR,
            numOfClusters: 3,
            ws: true,
            ssl: null,
            targetGroups: [],
            rules: []
        }));
        
    it('should have 3 clusters',
        () => assert.equal(3, server.length));
        
    it('should fire listening immediately',
        done => server.on('listening', done));
        
    it('should add target group', 
        done => server.addTargetGroup(targetGroup).then(() => done()));
        
    it('should add rule', 
        done => server.addRule(new lib.Rule({ path: REQUEST_PATH, targets: ['group-1'] })).then(() => done()));
        
    it('should proxy 100 requests', function(done) {
        
       this.timeout(5e3);
       
       let requestNum = 100;
       let requests = [];
       let servers = [];
       
       // Create 10 servers
       for(let port = PORT_MIN; port < PORT_MAX; port++)
            servers.push(new Promise(
                resolve => 
                    http.createServer((req, res) => res.end(String(port)))
                        .listen(port, TEST_SERVER_ADDR)
                        .on('listening', resolve)));
       
       co(function*(){
           
           yield Promise.all(servers);
           
           while(requestNum--)
             requests.push(
                 new Promise(
                     resolve => 
                        http.get(lbPath + REQUEST_PATH, 
                            response => response.on('data', c => resolve(String(c))))));
       
           Promise.all(requests).then(r => {
               assert.equal(r.length, 100);
               done();
           })
           
       });
       
    });
    
    it('should remove rules and target groups', done => co(function*(){
        
        yield server.removeTargetGroup(targetGroup);
        yield server.removeRule(0);
        
        assert.equal(0, server.rules.length);
        assert.equal(0, server.targetGroups.length);
        
        done();
        
    }));
    
    function get(url){
        return new Promise(resolve => {
            require('http').get(url, response => {
                let data = new Buffer();
                response.on('data', c => data = data.concat(c));
                response.on('end', () => resolve(data));
            })
        });
    }
        
});