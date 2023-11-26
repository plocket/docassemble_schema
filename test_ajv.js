// TODO: dependentRequired, dependentSchemas

// const { globSync } = require(`glob`);
const fs = require('fs');
const yaml = require('js-yaml');
const Ajv = require(`ajv/dist/2020`);

const { AggregateAjvError } = require(`@segment/ajv-human-errors`);
const { default: betterAjvErrors } = require('better-ajv-errors');

const chai = require(`chai`);

// Ours
const schema = require(`./docassemble_schema.json`);


// Keeping strict mode: https://ajv.js.org/strict-mode.html
const ajv = new Ajv({
  allErrors: true,  // For ajv-human-errors
  verbose: true,  // For ajv-human-errors
});
const validate = ajv.compile(schema);

// // Access files in loops with glob
// Confirm these tests pass
// const valid_files = globSync(`./valid/**/*.yml`);

// Confirm these tests fail
// const invalid_files = globSync(`./invalid/**/*.yml`);

const filename = './tests/valid/action_button/array.yml';
const data = yaml.load(fs.readFileSync(filename, 'utf8'));

const valid = validate(data);


// const output = betterAjvErrors(schema, data, validate.errors);
// console.log(`output:`, output);


if (!valid) {
  // TODO: figure out which "path" is the longest and just print that
  // one. Or at least print that one first.
  console.error(colorize(`------------------------`, `error`));
  console.error(colorize(`Failed:`, `error`), filename);
  const errors = new AggregateAjvError(validate.errors);
  console.log(errors.message.replace(/\. /g, `.\n`));
  // console.log(validate.errors);
} else {
  console.log(`Passed:`, filename);
}

// Get list of errors with useful details


function colorize(message, type_or_color) {
  // https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
  // https://en.wikipedia.org/wiki/ANSI_escape_code#Colors
  let color = type_or_color;
  if ( type_or_color === `error` ) {
    color = `red`;
  } else if ( type_or_color === `success` ) {
    color = `green`;
  }
  return `\x1b[1m\x1b[31m${ message }\x1b[0m`;
}
