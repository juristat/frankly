import { app } from './app.js';
import frankly from '../src/index.js';

let stuff = [1, 2];

for(let thing of stuff) {
	if(thing === 1) stuff.push(4);
	console.log(thing);
}
//console.dir(frankly.dump(), {colors: true, depth: null});
