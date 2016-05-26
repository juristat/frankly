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

import Wrapper from './app-wrapper';
import {getDocTree} from './app-walker';
import {render, serve} from './render';

/*
	maybe, TODO, this alternative form:

	app
		.doc `
			JSDoc here
		`
		.get('/', ...)

		.doc `...`
		.put('/', ...)


	And same for app.route(), Router, etc
*/


/**
 * frankly constructor; returns a new instance of frankly API.
 * @constructor
 */
function Frankly() {
	const wrapper = Wrapper();

	const publicApi = {
		declareDoc: wrapper.declareDoc,
		wrapApp: wrapper.wrapApp,
		Router: wrapper.Router,
		dump: wrapper.dump
	};

	return publicApi;
};

/** the default instance of the frankly public API */
export default Frankly();

/** static method to generate a new isolated frankly instance */
export {Frankly as createInstance};
