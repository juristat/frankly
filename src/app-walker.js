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

// gonna have to revive this for doc generation maybe (TODO)
// THIS IS OLD AND BUSTED; REWRITE
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
