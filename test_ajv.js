const fs = require('fs');
const yaml = require('js-yaml');
const Ajv = require(`ajv/dist/2020`);
// const { globSync } = require(`glob`);

// Ours
const schema = require(`./docassemble_schema.json`);
// const data = require(`./tests/valid/action_button/code.yml`);

// // Access files in loop with glob
// const valid_files = globSync(`./valid/**/*.yml`);
// const invalid_files = globSync(`./invalid/**/*.yml`);

const data = yaml.load(fs.readFileSync('./tests/valid/action_button/array.yml', 'utf8'));

// Maybe we keep strict mode? https://ajv.js.org/strict-mode.html
const ajv = new Ajv();
const validate = ajv.compile(schema);
const valid = validate(data);
console.log(`valid:`, valid);

if (!valid) {
	console.log(validate.errors);
}

// Get list of errors with useful details
