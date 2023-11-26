const fs = require('fs');
const yaml = require('js-yaml');
const Ajv = require(`ajv/dist/2020`);
// const { globSync } = require(`glob`);
const { AggregateAjvError } = require(`@segment/ajv-human-errors`);
const chai = require(`chai`);



// TODO: dependentRequired, dependentSchemas

// Ours
const schema = require(`./docassemble_schema.json`);
// const data = require(`./tests/valid/action_button/code.yml`);

// // Access files in loop with glob
// const valid_files = globSync(`./valid/**/*.yml`);
// const invalid_files = globSync(`./invalid/**/*.yml`);

const filename = './tests/valid/action_button/array.yml';
const data = yaml.load(fs.readFileSync(filename, 'utf8'));

// Maybe we keep strict mode? https://ajv.js.org/strict-mode.html
// const ajv = new Ajv({verbose: true, });
// const ajv = new Ajv({allErrors: true, });
// const ajv = new Ajv({$data: true, });
const ajv = new Ajv({
  allErrors: true,  // For ajv-human-errors
  verbose: true,  // For ajv-human-errors
});
const validate = ajv.compile(schema);
const valid = validate(data);
console.log(`valid:`, valid);





if (!valid) {
  const errors = new AggregateAjvError(validate.errors);
  console.log(`Failed:`, filename);
  // console.log(validate.errors);
  console.log(errors.message);
} else {
  console.log(`Passed:`, filename);
}

// Get list of errors with useful details
