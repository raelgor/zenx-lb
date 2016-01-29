# zenx-lb
A tiny load balancer used by the [ZenX](https://github.com/raelgor/zenx) project.

## Manual
* [Installation](#installation)
* [Quick example](#quickexample)
* [Class: lib.LoadBalancer(options)](#class-libloadbalanceroptions)
    * [Event: 'listening'](#event-listening)
    * [Event: 'close'](#event-close)
    * [Event: 'error'](#event-error)
    * [lb.addTargetGroup(targetGroup)](#lbaddtargetgrouptargetgroup)
    * [lb.removeTargetGroup(targetGroup)](#lbremovetargetgrouptargetgroup)
    * [lb.addRule(rule)](#lbaddrulerule)
    * [lb.removeRule(rule)](#lbremoverulerule)
    * [lb.close()](#lbclose)
* [Class: lib.TargetGroup(options)](#class-libtargetgroupoptions)
    * [tg.addTarget(options)](#tgaddtargetoptions)
    * [tg.removeTarget(target)](#tgremovetargettarget)
* [Class: lib.Rule(options)](#class-libruleoptions)
    * [rule.update()](#ruleupdate)
    
### Installation
Depending on your Node version, you may need `--harmony` or `--es_staging` to use this package.

### Quick example
```js
const lib = require('zenx-lb');
const co = require('co');

var lbOptions = {
    protocol: 'http',
    port: 10001,
    host: 'localhost',
    numOfClusters: 3,
    ws: true,
    ssl: null
}

var lb = new lib.LoadBalancer(lbOptions);

var tgOptions = {
    id: 'group-1',
    method: 'random',
    targets: [
        { port: 8182, host: 'localhost', protocol: 'http' },
        { port: 8183, host: 'localhost', protocol: 'http' }
    ]
}

var tg = new lib.TargetGroup(tgOptions);

lb.on('listening', () => co(function*(){

    yield lb.addTargetGroup(tg);

    yield lb.addRule({ host: 'mysite.com', targets: ['group-1'] });
    yield lb.addRule({ host: 'mysite2.com', path: '/images/*', targets: ['group-1'] });

    tg.addTarget({ port: 8184, host: 'localhost', protocol: 'http' });
    tg.removeTarget(0);

}));
```

### Class: lib.LoadBalancer(options)
Creates a `LoadBalancer` object that is an `EventEmitter` and wraps clustered subprocesses that host an http/s server which balances load between servers based on `Rule`s.

Options:
* `protocol` (Default: `'http'`): Protocol used by the load balancer server.
* `port`: Port to be used by the load balancer.
* `host`: Host address to bind load balancer to.
* `numOfClusters`: The `number` of clusters to be used. Usually as many as the available processors.
* `ws` (Default: `true`): Whether or not to proxy WebSockets.
* `ssl`: The `ssl` object will be passed directly as ssl settings to Node's `require('https').createServer(ssl, handler)`.

### Event: 'listening'
`function() { }`

Emitted when all clusters are created and each cluster's server handle has emitted a `'listening'` event.

### Event: 'close'
`function() { }`

Emitted when all clusters are dead.

### Event: 'error'
`function(error) { }`

Emitted when an error occurs.

### lb.addTargetGroup(targetGroup)
Returns a `Promise` that is resolved when the `targetGroup` has been successfully introduced to all clusters.

### lb.removeTargetGroup(targetGroup)
Returns a `Promise` that is resolved when the `targetGroup` has been successfully removed from all clusters. `targetGroup` can either be the object itself or it's `id`.

### lb.addRule(rule)
Returns a `Promise` that is resolved when the `rule` has been successfully introduced to all clusters.

### lb.removeRule(rule)
Returns a `Promise` that is resolved when the `rule` has been successfully removed from all clusters. `targetGroup` can either be the object itself or it's `id`.

### lb.close()
Returns `undefined`. Sends a `SIGTERM` signal to all clusters.

### Class: lib.TargetGroup(options)
Creates an object that stores a group of target server addresses.

Options:
* `id`: The group's id or a unique friendly name line `'group-1'`.
* `method` (Default: `'serial'`): The method used to balance the load. Can be `'random'`, `'serial'` or `function() { }` called by the `targetGroup` object. Only provide a function if you know what you're doing.
* `targets` (Default: `[]`): An `Array` that stores target information. Can be filled later with the [`tg.addTarget(options)`](#tgaddtargetoptions) method.

### tg.addTarget(options)
Adds a target server to a group. That group will emit an `update` event so that listening `LoadBalancer`s will update themselves.

Example:
```js
tg.addTarget({ port: 8080, protocol: 'http', host: 'localhost' });
```

### tg.removeTarget(target)
Removes a target by object reference or index number. That group will emit an `update` event so that listening `LoadBalancer`s will update themselves.

### Class: lib.Rule(options)
Creates a proxying rule. Rules work in the order they are introduced.

Example:
```js
new Rule({ host: 'mysite.com', targets: ['group-1'] }});
```

### rule.update()
Makes the rule emit an `update` event so that listening `LoadBalancer`s will update themselves.

Example:
```js
var mainRule = new Rule({ host: 'mysite.com', targets: ['group-1'] });

lb.addRule(mainRule);

mainRule.targets.push('group-2');
mainRule.update();

```

## License



(The MIT License)



Copyright (c) 2015 Kosmas Papadatos &lt;kosmas.papadatos@gmail.com&gt;



Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:



The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.



THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.