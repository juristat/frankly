/*!
Project: frankly
Author: Ben Chociej <ben.chociej@juristat.com>
File: test/app.js

Copyright 2016 Datanalytics, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

	http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import express from 'express';
import frankly from '../src/index.js';

const unwrapped = express();
const doc = frankly.declareDoc;


doc `what a superb app
@public`
const app = frankly.wrapApp(unwrapped);

doc `sup`
app.get('/', function(req, res){})

/*
for(let key in app) {
	let real = app[key];

	if(typeof real === 'function') {
		app[key] = (...args) => {
			console.dir({thisArg: this, key, args});
			return real.apply(app, args);
		}
	}
}
*/

doc `just your plain ol' basic router`
const basicRouter      = frankly.Router('basic');


const routedRouter     = frankly.Router('routed');
const recursiveRouter  = frankly.Router('recursive');
const paramRouter      = frankly.Router('param');
const allRouter        = frankly.Router('all');
const paramInUseRouter = frankly.Router('paramInUse');
const chainGetRouter   = frankly.Router('chainGet');

doc `This is a no-op middleware`
app.use('/', function thisIsAUseRoute(req, res, next) { next() });


doc `
	Says 'hello world'.
	@returns 'hello world'
`
app.get('/',         (req, res, next) => next(), (req, res) => res.send('hello world'));

doc `
	Posts something?
	@param {query} what
`
app.post('/',        (req, res) => res.send('post ' + req.query.what));


doc `Not sure why you'd use propfind but here you go`
app.propfind('/',    (req, res) => res.send('propfind world'));


doc `"m-search"? Seriously?`
app['m-search']('/', (req, res) => res.send('m-search world'));


doc `@returns 'basic'`
basicRouter.get('/',                                      (req, res) => res.send('basic'));


doc `
	Spits your params back out at you
	@param fizz
	@param buzz
	@param quzz
	@returns {fizz, buzz, quux}
`
basicRouter.get('/parameterized/:fizz/:buzz/const/:quux', (req, res) => res.json(req.params));


doc `
	Captures a regex match and returns it.
	@returns params - the regex match in this case
`
basicRouter.get(/\/regex\/(.*)/,                          (req, res) => res.json(req.params));

doc `route doc cool`
routedRouter.route('/base/route/:param/')
	.doc `get it`
	.get((req, res) => res.send('get it'))
	.doc `put it`
	.put((req, res) => res.send('put it'));

recursiveRouter.get('/', (req, res) => res.send('you made it'));
recursiveRouter.use('/more/', recursiveRouter);

paramRouter.param('thing',  (req, res, next, id) => { req.thing = `this is thing called '${id}'`; next(); });
paramRouter.get('/:thing/', (req, res) => res.send(req.thing));

allRouter.all('*', (req, res) => res.send('allrighty then'));

paramInUseRouter.get('/wow/', (req, res) => res.send('very complicate'));

chainGetRouter.get('/',
	(req, res, next) => next(),
	(req, res, next) => next(),
	(req, res) => res.send('done')
);

app.use('/basic/',               basicRouter);
app.use('/routed/',              routedRouter);
app.use('/recursive/',           recursiveRouter);
app.use('/param/',               paramRouter);
app.use('/all/',                 allRouter);
app.use('/param-in-use/:param/', paramInUseRouter);
app.use('/chain/',               chainGetRouter);

export { app, unwrapped };
