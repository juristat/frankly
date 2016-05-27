import { app, unwrapped } from './app.js';
import frankly from '../src/index.js';

let foo = {a: 1, b: 2, c: 3};

console.dir(frankly.walk(app), {colors: true, depth: null});
