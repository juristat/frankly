/*!
Project: frankly
Author: Ben Chociej <ben.chociej@juristat.com>
File: src/index.js

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

/** @module frankly */

import Wrapper from './wrapper';
import Walker from './walker';
import {render} from './renderer';

// TODO: wrapper needs to give Routers serial numbers since they won't always be named; walker needs to refer to S/Ns


/**
 * frankly constructor; returns a new instance of frankly API.
 * @constructor
 */
function Frankly() {
	const wrapper = Wrapper();
	const walker = Walker(wrapper);

	const publicApi = {
		declareDoc: wrapper.declareDoc,
		wrapApp: wrapper.wrapApp,
		Router: wrapper.Router,
		hookRouterCtor: wrapper.hookRouterCtor,
		unhookRouterCtor: wrapper.unhookRouterCtor,
		registerRouter: wrapper.registerRouter,
		walk: walker.walk,
		render
	};

	return publicApi;
};

/** the default instance of the frankly public API */
export default Frankly();

/** static method to generate a new isolated frankly instance */
export {Frankly as createInstance};
