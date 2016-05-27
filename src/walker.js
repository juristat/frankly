/*!
Project: frankly
Author: Ben Chociej <ben.chociej@juristat.com>
File: src/walker.js

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

/** @module frankly/src/walker */

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

function Walker(wrapper) {
	// a layer has .route, .method, .handle or .stack
	// worry about: path keys regexp handle
	function _process(layer, pathElements, emit, emitRouter) {
		const nextElem = {
			path: (layer._router || layer.regexp) ? undefined : (layer.path || '/'),
			mountpath: layer.mountpath,
			regexp: layer.regexp,
			keys: layer.keys
		};

		for(let key in nextElem) {
			if(typeof nextElem[key] === 'undefined') delete nextElem[key];
			if(Array.isArray(nextElem[key]) && nextElem[key].length === 0) delete nextElem[key];
		}

		pathElements = pathElements.concat(nextElem);

		const doc = wrapper.getLayerDoc(layer);

		if(layer.method) {
			// HTTP verb Layer (leaf node)
			// emit: pathElements + layer.method + doc-if-any + method

			emit({
				type:      'method',
				pathChain: pathElements,
				method:    layer.method,
				jsdoc:     doc
			});

		} else if(!!layer.route && typeof layer.route !== 'function') {
			// Route Layer
			// recurse: each in layer.route.stack
			// emit-if-doc: pathElements + doc-if-any + Route

			if(doc) {
				emit({
					type:      'route',
					pathChain: pathElements,
					route:     layer.route,
					jsdoc:     doc // TODO: sometimes this is grabbing the next method's doc!!!
				});
			}

			layer.route.stack.forEach((layer) => _process(layer, pathElements, emit, emitRouter));

		} else if(layer.stack || (layer._router && layer._router.stack)) {
			// top level of a Router
			// recurse: each in layer.stack
			// emit: pathElements + doc-if-any + router-name

			// TODO: add Wrapper ability to document a router?
			// e.g. doc `A cool router` Router('name');

			const router = layer.stack ? layer : layer._router;
			const name = wrapper.getRouterName(router);
			const index = wrapper.getRouterIndex(router);

			const item = {
				type:        layer._router ? 'app' : 'router',
				pathChain:   pathElements,
				jsdoc:       doc
			}

			if(name) item.routerName = name;
			if(index) item.routerIndex = index;

			emit(item);

			router.stack.forEach((layer) => _process(layer, pathElements, emit, emitRouter));

		} else if(layer.handle && layer.name === 'router') {
			// Router middleware Layer (leaf node)
			// push layer.handle onto todo list if not already in done list
			// emit pathElements + ref-to-router + doc-if-any + router-name

			// NB: this doc will not be the doc for the router, but for the .use(router) call

			const name = wrapper.getRouterName(layer.handle);

			emit({
				type:        'router-ref',
				pathChain:   pathElements,
				name:        name,
				index:       wrapper.getRouterIndex(layer.handle),
				jsdoc:       doc
			});

			emitRouter(layer.handle);

		} else if(layer.handle) {
			// regular middleware layer (leaf node)
			// emit pathElements + layer.name-if-any + doc-if-any + handle

			emit({
				type:      'middleware',
				pathChain: pathElements,
				handle:    layer.handle,
				jsdoc:     doc
			});
		}
	};

	function walk(routerish) {
		const todo = [routerish];
		const done = new Map;

		for(let current of todo) {
			const docs = []; // TODO: some kind of doc tree structure? Maybe add it into the recursion?

			_process(
				current,
				[],
				function emit(docObj) {
					for(let key in docObj) {
						if(typeof docObj[key] === 'undefined') delete docObj[key];
					}

					docs.push(docObj);
				},
				function emitRouter(router) { if(!done.has(router)) todo.push(router); }
			);

			done.set(current, docs);
		}

		const output = {};

		done.forEach(function(docs, routerish) {
			const item = {
				type:  routerish.stack ? 'router' : 'app',
				name:  routerish.stack ? (wrapper.getRouterName(routerish) || '<unnamed>') : '<app>',
				docs:  docs
			}

			if(item.type === 'app') {
				if(output.app) throw new Error('multiple apps encountered');
				output.app = item;
			} else if(item.type === 'router') {
				output.routers = output.routers || [];
				item.routerIndex = wrapper.getRouterIndex(routerish)
				output.routers.push(item);
			}
		});

		output.routers = output.routers.sort((a, b) => a.routerIndex - b.routerIndex);

		return output;
	};

	return {walk};
};

export default Walker;
