let fs = require('fs');
let importOsu = require('./importer');

let args = process.argv.slice(2);
console.log('args', args);
args[0] = fs.readFileSync(args[0]).toString();
importOsu(...args);