/*!
Project: frankly
Author: Ben Chociej <ben.chociej@juristat.com>
File: test/basic.js

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

import {app, unwrapped} from './app';
import frankly from '../src/index';
import {print} from '../src/util'

// TODO sometimes a simple method doc is getting tied to the implicit route, see walker TODO
print(frankly.render(frankly.walk(app)));
