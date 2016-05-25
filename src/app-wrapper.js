/*!
Project: frankly
Author: Ben Chociej <ben.chociej@juristat.com>
File: src/app-wrapper.js

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

/** @module frankly/src/app-wrapper */

import assert from 'assert';
import express from 'express';
import {parse as parseDoc} from 'doctrine';
import methods from 'methods';

const ORIGINAL_EXPRESS_ROUTER_CTOR = express.Router;

/**
 * This crazy thing takes an express.js app (express()) or router (express.Router()) and builds a façade (separate
 * from the original object) that is decorated/instrumented to allow JSDoc strings to be attached. The documentation
 * recording aspect works by mapping an express.js router Layer object to its JSDoc string for later export,
 * publishing, etc.
 *
 * The Map of Layers to docstrings is not sufficient by itself to generate fully meaningful documentation; Layers don't
 * know their own path information, for one thing. Rather, the Map created here will be used later when frankly's app
 * walker component traverses the entire app routing tree to build a path-oriented data structure.
 *
 * Calling with `new` is not necessary; this is just a factory function.
 *
 * In general, routers (express.Router()) and apps (express()) are treated the same. In this code, I sometimes use the
 * noun 'routerish' to refer to a variable that could be either one, but you can assume that the term 'router' could be
 * an app or a router also.
 *
 * However, in the exported API, wrapApp() should only be used with apps, and registerRouter() and getRouterName()
 * should only be used with routers.
 *
 * @example <caption>Basic usage</caption>
 * let wrapper = Wrapper();
 * let doc = wrapper.declareDoc;
 * let app = wrapper.wrapApp(express());
 *
 * doc `
 *     Hello world route
 *     @returns 'hello world'
 * `
 * app.get('/', (req, res) => res.send('hello world'));
 */
function Wrapper() {
	const _layerDocs = new Map;
	const _routers   = new Map;
	const _facades   = new WeakSet;

	let _nextDoc;

	/**
	 * Rebuild ES2015 tagged template strings + values into a single string.
	 * @private
	 * @param {string[]|string} strings - ES2015 tagged template strings, or one string as the sole argument (fallback)
	 * @param {*[]} values - ES2015 tagged template values, which will be interleaved to rebuild a single string
	 * @returns {string} the entire template string, reassembled
	 */
	function _reassembleTaggedTemplate(strings, values) {
		if(typeof strings === 'string') return strings;

		const boundaries = values.length;
		let result = '';

		for(let i = 0; i < boundaries; i++) {
			result += strings[i] + values[i]
		}

		return result + strings[boundaries];
	};

	/**
	 * Get the routing stack from the specified app or router (routerish thing)
	 * @private
	 * @returns {Object} routing stack
	 */
	function _getStack(routerish) {
		const stack = routerish._router ? routerish._router.stack : routerish.stack;
		assert(Array.isArray(stack), 'stack is not an array');
		return stack;
	};

	/**
	 * Attach the most recently seen doc string to the current express.js method (e.g. an app.get(...))
	 * @private
	 */
	function _marryDocToSimpleMethodLayer(routerish) {
		return function(...args) {
			// if args.length is 1, this is not a route method handler (e.g. app.get(property))
			if(args.length >= 2 && _nextDoc) {
				const stack = _getStack(routerish);
				assert(stack.length > 0, 'stack is empty');
				const routeLayer = stack[stack.length - 1];
				assert(routeLayer && routeLayer.route && routeLayer.route.stack, 'routeLayer has no stack');
				assert.equal(routeLayer.route.stack.length, 1, 'route stack should have only one layer');

				// target Layer is the only Layer on the Route stack, which is the latest Layer on the routerish stack
				const thisLayer = routeLayer.route.stack[0];

				_layerDocs.set(thisLayer, _nextDoc);
				_nextDoc = null;
			}
		};
	};

	/**
	 * Attach the most recently seen doc string to the current express.js route method (e.g. app.route(...).get(...))
	 * @private
	 */
	function _marryDocToRouteMethodLayer(route) {
		return function(...args) {
			if(_nextDoc) {
				const stack = route.stack;
				assert(stack && stack.length, 'route must have stuff on its stack');

				// target Layer is the latest Layer on the Route stack
				const thisLayer = stack[stack.length] - 1;

				_layerDocs.set(thisLayer, _nextDoc);
				_nextDoc = null;
			}
		};
	};

	/**
	 * Attach the most recently seen doc string to the current express.js route (i.e. router.route(...))
	 * @private
	 */
	function _marryDocToRoute(routerish) {
		return function(...args) {
			if(_nextDoc) {
				const stack = _getStack(routerish);
				assert(stack.length > 0, 'stack is empty');

				// target Layer is the latest Layer on the routerish stack (a Route middleware Layer)
				const thisLayer = stack[stack.length - 1];

				_layerDocs.set(thisLayer, _nextDoc);
				_nextDoc = null;
			}
		};
	};

	/**
	 * Attach the most recently seen doc string to the current express.js middleware (i.e. router.use(...))
	 * @private
	 */
	function _marryDocToMiddleware(routerish) {
		return function(...args) {
			if(_nextDoc) {
				const stack = _getStack(routerish);
				assert(stack.length > 0, 'stack is empty');

				// target Layer is the latest Layer on the routerish stack (an arbitrary middleware Layer)
				const thisLayer = stack[stack.length - 1];

				_layerDocs.set(thisLayer, _nextDoc);
				_nextDoc = null;
			}
		};
	};

	/**
	 * Given a facade object (e.g. using Object.create) and its original, also call hookFn when methodName is called
	 * @private
	 * @param {Router|app} facade - the facade object (from e.g. Object.create) which will hold the hooked methods
	 * @param {Router|app} original - the original target object
	 * @param {string} methodName - the name of the method to hook
	 * @param {function} hookFn - the function to call when the facade receives a call to the specified method
	 */
	function _hookFacadeMethod(facade, original, methodName, hookFn) {
		if(typeof original[methodName] !== 'function') return;

		facade[methodName] = function(...args) {
			const result = original[methodName].apply(original, args);
			hookFn.apply(original, args);
			return result;
		};
	};

	/**
	 * Hook all the HTTP routing methods on the specified facade with _marryDocToSimpleMethodLayer
	 * @private
	 * @param {Router|app} facade - the facade object to hold the hooked methods
	 * @param {Router|app} original - the target Router or method
	 */
	function _hookHttpMethods(facade, original) {
		for(let httpMethod of methods.concat('all')) {
			_hookFacadeMethod(facade, original, httpMethod, _marryDocToSimpleMethodLayer(original));
		}
	};

	/**
	 * Hook #use() on the specified facade with _marryDocToMiddleware
	 * @private
	 * @param {Router|app} facade - the facade object to hold the hooked methods
	 * @param {Router|app} original - the target Router or method
	 */
	function _hookMiddlewareMethods(facade, original) {
		_hookFacadeMethod(facade, original, 'use', _marryDocToMiddleware(original));
	};

	/**
	 * Hook #route() and its child methods on the specified facade with the right thing
	 * @private
	 * @param {Router|app} facade - the facade object to hold the hooked methods
	 * @param {Router|app} original - the target Router or method
	 */
	function _hookRouteMethods(facade, original) {
		facade.route = function(...args) {
			const origRoute = original.route.apply(original, args);
			const facadeRoute = Object.create(origRoute);

			_marryDocToRoute(original)(...args);

			for(let httpMethod of methods.concat('all')) {
				_hookFacadeMethod(facadeRoute, origRoute, httpMethod, _marryDocToRouteMethodLayer(origRoute));
			}

			return facadeRoute;
		};
	};

	/**
	 * Wrap the target Router or app's HTTP routing and middleware methods
	 * @private
	 * @param {Router|app} target - the express.js Router or app to wrap
	 */
	function _wrapRouterOrApp(target) {
		if(_facades.has(target)) return target;

		const facade = Object.create(target);

		_hookHttpMethods(facade, target);       // HTTP verbs + 'all'
		_hookMiddlewareMethods(facade, target); // 'use' - for middlewares
		_hookRouteMethods(facade, target);      // for when app.route(...) is used

		_facades.add(facade);

		return facade;
	};

	/**
	 * Declare a JSDoc string for documenting the next declared route
	 * @public
	 * @alias frankly
	 * @param {string[]|string} strings - ES2015 tagged template strings, or one string as the sole argument (fallback)
	 * @param {*[]} ...values - ES2015 tagged template values, which will be interleaved to rebuild a single string
	 */
	function declareDoc(strings, ...values) {
		_nextDoc = parseDoc(_reassembleTaggedTemplate(strings, values), {sloppy: true});
	};

	/**
	 * Make frankly aware of a particular router, using a particular human-readable name. NB: Routers *must* be
	 * registered via this method in order for frankly to be aware of JSDoc that is attached to their methods.
	 * @public
	 * @alias frankly#router
	 * @param {string} name - the name you'd like to give the Router (for human consumption)
	 * @param {Router} router - the express.js Router being considered
	 */
	function registerRouter(router, name) {
		if(_facades.has(router)) {
			throw new Error('router is already registered');
		}

		if(!!name) {
			if(typeof name !== 'string') {
				throw new TypeError('router name must be a string');
			}
		} else {
			name = null;
		}

		_routers.set(router, name);
		return _wrapRouterOrApp(router);
	};

	/**
	 * A Router constructor, just like express.Router(), that accepts an optional name and registers the router in
	 * frankly's data structures under that name. Also wraps the Router's methods so that frankly can be used to
	 * document this Router.
	 * @public
	 * @param {string*} name - the name by which to call the Router (human readable)
	 * @returns {Router} a frankly-enabled Router
	 */
	function Router(name) {
		return registerRouter(ORIGINAL_EXPRESS_ROUTER_CTOR.apply(express), name);
	};

	/**
	 * Make all express.Router() calls return a frankly-enabled Router object, pinned to this instance of frankly.
	 * The hooked Router constructor will accept a name for frankly to use, e.g. `express.Router('users')`
	 * @public
	 */
	function hookRouterCtor() {
		if(express.Router === ORIGINAL_EXPRESS_ROUTER_CTOR) {
			express.Router = Router;
		}
	};

	/**
	 * Unhook frankly from all express.Router(), restoring the original, untouched version of the function
	 * @public
	 */
	function unhookRouterCtor() {
		express.Router = ORIGINAL_EXPRESS_ROUTER_CTOR;
	};

	/**
	 * Specify the express.js app to use, and return a version with magic wrapped route methods
	 * @public
	 * @alias frankly#app
	 * @param {app} app - the express.js app
	 * @returns {app} a version of the app that has been instrumented for generation of documentation
	 */
	function wrapApp(app) {
		return _wrapRouterOrApp(app);
	};

	// TODO: function app() { returns a new wrapped express() app }
	// TODO: function hookExpress() { hooks the express() and express.Router() ctors globally, for convenience }

	/**
	 * Get the parsed JSDoc associated with the specified layer
	 * @public
	 * @param {Layer} layer - the layer you want to get the doc string for
	 * @returns {Object|undefined} - the JSDoc object for the specified layer, or undefined if none exists
	 */
	function getLayerDoc(layer) {
		return _layerDocs.get(layer);
	};

	/**
	 * Get the human-readable name associated with this router
	 * @public
	 * @param {Router} router - the router you want to get the name for
	 * @returns {string|undefined} - the name of the router, or undefined if it has not been registered
	 */
	function getRouterName(router) {
		return _routers.get(_facades.get(router) || router);
	};

	return {
		declareDoc,
		registerRouter,
		Router,
		hookRouterCtor,
		unhookRouterCtor,
		wrapApp,
		getLayerDoc,
		getRouterName
	};
};

export default Wrapper;
