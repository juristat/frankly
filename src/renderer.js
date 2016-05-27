/*!
Project: frankly
Author: Ben Chociej <ben.chociej@juristat.com>
File: src/renderer.js

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

/** @module frankly/src/renderer */

import {parse} from 'doctrine'
import {print} from './util'

const PARAM = {};
const CULL = {};

function _trySimplifyRegexp(regexp) {
	let r = regexp.toString();


	if(r === '/^\\/?$/i') return '/';
	if(r === '/^(.*)\\/?$/i') return '*';

	r = r.split('\\/');

	if(r.length > 0) {
		r = r.filter((piece) => piece !== '/^' && piece !== '?$/i')

		for(let i = 0; i < r.length - 1; i++) {
			if(r[i] === '(?:([^' && r[i+1] === ']+?))') {
				r[i] = PARAM;
				r[i+1] = CULL;
			} else if(r[i] === '?(?=' && r[i+1] == '|$)/i') {
				r[i] = CULL;
				r[i+1] = CULL;
			}
		}

		r = r.filter((piece) => piece !== CULL);
	}

	for(let piece of r) {
		if(piece !== PARAM && piece.indexOf('/') > -1) return regexp;
	}

	return r;
};

function _reducePathElements(chain) {
	return chain.reduce(function(memo, next) {
		if(next.keys) {
			memo.keys = memo.keys.concat(next.keys);
		}

		if(next.path) {
			next = next.path;
		} else if(next.regexp) {
			next = _trySimplifyRegexp(next.regexp);
		} else if(next.mountpath) {
			next = next.mountpath;
		}

		if(next !== '' && next !== '/') {
			memo.path = memo.path.concat(next);
		}

		return memo;
	}, {keys: [], path: []});
};

function _simplifyPaths(item) {
	item.docs.forEach(function(doc) {
		const simplified = _reducePathElements(doc.pathChain);
		doc.simplePath = simplified.path;
		doc.keys = simplified.keys;

		let keys = doc.keys.slice();
		doc.simplePath = doc.simplePath.map(function(element) {
			if(element === PARAM) {
				return ':' + keys.shift().name;
			}

			return element;
		});

		doc.sortKey = [''].concat(doc.simplePath).concat('').join('|');
	});
};

function _collate(item) {
	_simplifyPaths(item);

	item.collated = {};

	item.docs.forEach(function(doc) {
		if(!item.collated[doc.sortKey]) item.collated[doc.sortKey] = [];
		item.collated[doc.sortKey].push(doc);
	});
};

function render(walked) {
	_collate(walked.app);
	if(walked.routers) {
		walked.routers.forEach(_collate);
	} else {
		walked.routers = [];
	}

	const collated = {
		app: walked.app.collated,
		routers: walked.routers.map((r) => ({
			name: r.name,
			routerIndex: r.routerIndex,
			collated: r.collated
		}))
	}


	// janktastic docs here:

	const output = [];

	output.push('APP.');
	output.push('');

	for(let path in collated.app) {
		output.push('\tPATH:\t' + path);
		output.push('');

		for(let item of collated.app[path]) {
			output.push('\t\tTYPE:\t' + item.type);
			if(item.method) output.push('\t\tMETHOD:\t' + item.method);
			if(item.jsdoc) output.push('\t\tJSDOC:\t' + item.jsdoc);
			output.push('');
		}

		output.push(''); output.push('');
	}

	output.push(''); output.push(''); output.push(''); output.push('');

	for(let router of collated.routers) {
		output.push('ROUTER:\t' + router.name);
		output.push('INDEX:\t' + router.routerIndex);
		output.push('');

		for(let path in router.collated) {
			output.push('\tPATH:\t' + path);
			output.push('');

			for(let item of router.collated[path]) {
				output.push('\t\tTYPE:\t' + item.type);
				if(item.method) output.push('\t\tMETHOD:\t' + item.method);
				if(item.jsdoc) output.push('\t\tJSDOC:\t' + item.jsdoc);
				output.push('');
			}

			output.push(''); output.push('');
		}

		output.push(''); output.push(''); output.push(''); output.push('');
	}

	console.log(output.join('\n'));
};

export {render};
