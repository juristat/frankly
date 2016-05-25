import express, { Router } from 'express';
import frankly from '../src/index.js';

let app = frankly.app(express());

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

const basicRouter      = Router();
const routedRouter     = Router();
const recursiveRouter  = Router();
const paramRouter      = Router();
const allRouter        = Router();
const paramInUseRouter = Router();
const chainGetRouter   = Router();

frankly `User`
app.use('/', function thisIsAUseRoute(req, res, next) { next() });

frankly `Says 'hello world'.`
app.get('/',         (req, res, next) => next(), (req, res) => res.send('hello world'));

frankly `Posts something?
	@param {query} what`
app.post('/',        (req, res) => res.send('post ' + req.query.what));

app.propfind('/',    (req, res) => res.send('propfind world'));

app['m-search']('/', (req, res) => res.send('m-search world'));

basicRouter.get('/',                                      (req, res) => res.send('basic'));
basicRouter.get('/parameterized/:fizz/:buzz/const/:quux', (req, res) => res.json(req.params));
basicRouter.get(/\/regex\/(.*)/,                          (req, res) => res.json(req.params));

routedRouter.route('/base/route/:param/')
	.get((req, res) => res.send('get it'))
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

export { app };
