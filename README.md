#frankly
stupid simple docs for your express thing

it's jsdoc, see usejsdoc.org

##how to setup your app
###ES6 (`import`) examples
```javascript
import frankly, {declareDoc as doc} from 'frankly';
import express from 'express';


// create a new express app and wrap it with frankly's instrumentation
const app = frankly.wrapApp(express());


// now make some routes and stuff! here are examples


// Ex. 1. Basic HTTP GET example
doc `
	Hello World route
	@public
	@returns 'Hello, world!'
`
app.get('/', (req, res) => res.send('Hello, world!'));


// Ex. 2. Using the express `.route()` syntax
app.route('/widgets/')
	.doc `
		List widgets
		@returns {string[]} a list of widget names
	`
	.get((req, res) => res.send(widgetList))

	.doc `
		Add a widget
		@param {string} ?name - the name of the new widget
	`
	.post((req, res) => addWidget(req.query.name));
```

###non-ES6 (`require`) examples
```javascript
var express = require('express');


// create an instance, or use the default one created at require-time
var frankly = require('frankly').createInstance();
var frankly = require('frankly').default;


// call this however you want. we use 'doc' for shorthand, you could use $ if it's available, whatever.
var doc = frankly.declareDoc;


// create a new express app and wrap it with frankly's instrumentation
var app = frankly.wrapApp(express());


// now use frankly:


// Ex. 3. Using an express.Router
// You can use various forms to create a frankly-enabled Router; any of the below will work:

// form 1
doc(['Users routes']);
var userRouter = frankly.registerRouter(express.Router(), 'userRouter');

// form 2 (*preferred*)
doc(['Groups routes']);
var groupRouter = frankly.Router('groupRouter');

// form 3
frankly.hookRouterCtor(); // now express.Router() takes a name argument and uses frankly directly
doc(['Widgets routes']);
var widgetRouter = express.Router('widgetRouter');



// now use the Routers like usual:

doc(['List Users',
	'@returns {string[]} a list of usernames']);
userRouter.get('/', listUsers);

doc(['/users/ directory delegates to Users router']);
app.use('/users/', userRouter);

// etc.
```

##what all can you document
* App methods: `app.get(path, handler)`, `app.put(path, handler)`, etc.
* Routers: `frankly.Router(name)` or `express.Router(name)` if configured
* Router methods: `someRouter.get(path, handler)`, etc.
* Routes and their methods: `app.route(path).get(handler).put(handler) // etc`
* Middlewares: `app.use(middleware)`

You can document all the HTTP verbs the express knows about (based on the 'methods' npm package), as well as `.all()`.


##how to make docs happen
###TODO: make the API less clunky
```javascript
var htmlRenderer = require('frankly/lib/renderers/html');
var docJson      = frankly.walk(app);

frankly.render(docJson, htmlRenderer('/path/to/output/'));
```
