export default function dumpToConsole(collated) {
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
			if(item.jsdoc) output.push('\t\tJSDOC:\t' + JSON.stringify(item.jsdoc));
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
				if(item.jsdoc) output.push('\t\tJSDOC:\t' + JSON.stringify(item.jsdoc));
				output.push('');
			}

			output.push(''); output.push('');
		}

		output.push(''); output.push(''); output.push(''); output.push('');
	}

	console.log(output.join('\n'));
};
