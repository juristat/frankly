import { app, unwrapped } from './app.js';
import frankly from '../src/index.js';

console.dir(frankly.walk(app), {colors: true, depth: null});
