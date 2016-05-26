/*!
Project: frankly
Author: Ben Chociej <ben.chociej@juristat.com>
File: src/app-walker.js

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



/*
	Battle plan.

	1. Push app._router onto a list
	2. While the list is not empty:
		A. Get the first router from the list
		B. Traverse that router:
			i. Walk the tree of Layers, building up path information as a vector of path elements
			ii. Listen for emits from later steps and store them in order in a succinct data structure for the current
				router being traversed
			ii. If any Layer has a layerDoc or is a Router middleware layer:
				true)
					a. emit the path and route/method/router/middleware info along with the layerDoc and
						meta-information (filename? other info?)
					b. If this Layer is a Router middleware Layer and the Router has not yet been traversed:
						true) push it onto the list.
	3. Assemble the data structures generated from 2.B.ii. into a single report for export, rendering, etc.
*/

// a layer has .route, .method, .handleor .stack
// worry about: path keys regexp handle
function _process(layer, routeElements) {
	if(layer.path) {
		routeElements = routeElements.concat(layer.path);
	} else if(layer.regexp) {
		routeElements = routeElements.concat(layer.regexp);
	}

	if(layer.method) {
		// HTTP verb Layer
		// leaf node! yay
		// emit: routeElements + layer.method + doc-if-any
	} else if(layer.route) {
		// Route Layer
		// recurse: each in layer.route.stack
		// emit: routeElements + doc-if-any
	} else if(layer.stack) {
		// top level of a Router
		// recurse: each in layer.stack
		// emit: routeElements + doc-if-any.

		// TODO: are we attaching docs here yet?
		// e.g. doc `A cool router` Router('name');
	} else if(layer.handle && layer.name === 'router') {
		// Router middleware Layer
		// push layer.handle onto todo list if not already in done list
		// emit routeElements + ref-to-router + doc-if-any
	} else if(layer.handle) {
		// regular middleware layer
		// leaf node! yay!
		// emit routeElements + layer.name-if-any + doc-if-any

		// TODO: allow extensibility here?
	}
};

function walk(app) {
	const todo = [app._router];
	const done = [];

	for(let current of todo) {
		let result = _process(current, ['/']);
	}
};


/*
// THIS IS OLD AND BUSTED
function walkEntireApp(target) {
	const knownRouters = new Map;

	const walkers = {
		// a top level express app; has layer._router
		app: (layer) => ({
			nodeType: 'app',
			app: layer._router.stack.map(walk)
		}),

		// a router is anything with a stack, generally
		router: (layer) => {
			let subtree = knownRouters.get(layer.handle.stack);
			let cycle = true;

			if(!subtree) {
				cycle = false;
				subtree = [];
				knownRouters.set(layer.handle.stack, subtree);
				subtree = subtree.concat(layer.handle.stack.map(walk));
			}

			// TODO: name the routers somehow
			return {
				nodeType: 'router',
				path: layer.path, // routers ONLY have regexps - this will be undefined
				regexp: layer.regexp,
				keys: layer.keys,
				router: subtree,
				cycle
			};
		},

		// a route is a Route object; it has only methods in its stack
		route: (layer) => ({
			nodeType: 'route',
			path: layer.route.path,
			regexp: layer.regexp,
			keys: layer.keys,
			methods: layer.route.stack.map(walk)
		}),

		// a method is a terminus in the route chain that attaches a handle to a verb such as get, post, etc
		method: (layer) => ({
			nodeType: 'method',
			verb: layer.method ? layer.method : '*',
			handle: layer.handle
		}),

		// other: everything else (middleware, ...)
		other: (layer) => ({
			nodeType: 'other',
			name: layer.name,
			handle: layer.handle
		})
	};

	function walk(layer) {
		if(layer._router) {
			return walkers.app(layer);
		} else if(layer.handle && layer.handle.stack) {
			return walkers.router(layer);
		} else if('method' in layer) {
			return walkers.method(layer);
		} else if(layer.route) {
			return walkers.route(layer);
		} else {
			return walkers.other(layer);
		}
	};

	return walk(target);
}

// experimental
function getRouteList(api) {
	const walkers = {};
	const routes = [];

	walkers.app = (node) => {
		const pathElements = ['/'];
		const params = [];
		node.app.forEach((child) => walkers[child.nodeType](pathElements.slice(), params.slice(), child));
	}

	walkers.router = (pathElements, params, node) => {
		pathElements.push(node.path || node.regexp);
		params = params.concat(node.keys);
		node.router.forEach((child) => walkers[child.nodeType](pathElements.slice(), params.slice(), child));
	};

	walkers.route = (pathElements, params, node) => {
		pathElements.push(node.path || node.regexp);
		params = params.concat(node.keys);
		node.methods.forEach((child) => walkers[child.nodeType](pathElements.slice(), params.slice(), child));
	};

	walkers.method = (pathElements, params, node) => {
		const method = {
			params,
			verb: node.verb,
			handle: node.handle
		};

		routes.push(pathElements.concat(method));
	};

	walkers.other = (pathElements, params, node) => {
		return; // TODO
	};

	walkers.app(api);
	return routes;
}
*/
