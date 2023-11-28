#!/usr/bin/env node

// TODO: dependentRequired, dependentSchemas

const { globSync } = require(`glob`);
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

// TODO: Maybe loop collecting successes and failures into their own
// groups (both for valid, then both for invalid) and print all at
// once? What if the tests actually exit in the middle?

// // Loop to get results of each file that should pass
// const passer_paths = globSync(`./valid/**/*.yml`);
// for ( let file_path of passer_paths ) {

// }

// Loop to get results of each file that should fail
// const passer_paths = globSync(`./invalid/**/*.yml`);
// for ( let file_path of passer_paths ) {

// }

// Confirm these tests fail
// const invalid_files = globSync(`./invalid/**/*.yml`);

const file_path = './tests/valid/action_button/array.yml';
const data = yaml.load(fs.readFileSync(file_path, 'utf8'));
const valid = validate(data);

const argv = require(`minimist`)( process.argv.slice(2), {
  alias: { verbose: `v` },
  default: { verbose: `false` }
});

const options = {};
if ( argv.verbose === `true` ) {
  options.indent = 2;
} else {
  options.format = `js`;
  // Line numbers are only useful when yaml string are on the
  // same line as their key
  options.json = JSON.stringify(data, null, 2)
    .replace( /\n\s*\{/g, '{' )
    .replace( /\n\s*\[/g, '[' )
    .replace( /\n\s*}/g, '}' )
    .replace( /\n\s*]/g, ']' )
    .replace( /^(.)\n\s*/, '\$1' );
  // Get something that retains the yml to json line number map and this
  // would be easier. Phind think it's pretty unfeasible:
  // https://www.phind.com/search?cache=c7fq6ftdav4tx8bnpegyj7j3
}

// const output = betterAjvErrors(schema, data, validate.errors);
// console.log(`output:`, output);
const output = betterAjvErrors(schema, data, validate.errors, options);
console.log(format_better_ajv_errors({ output, file_path }));





// // Get list of errors with useful details
// if (!valid) {
//   // TODO: figure out which "path" is the longest and just print that
//   // one. Or at least print that one first.
//   console.error(colorize(`------------------------`, `error`));
//   console.error(colorize({message: `Failed:`, modifier: `error`}), file_path);
//   const errors = new AggregateAjvError(validate.errors);
//   console.log(errors.message.replace(/\. /g, `.\n`));
//   // console.log(validate.errors);
// } else {
//   console.log(colorize(`Passed:`, `success`), file_path);
// }


function format_better_ajv_errors ({ output, file_path, verbose, is_passer }) {
  /** Output one test's success or errors.
   *
   * Data shape (https://github.com/atlassian/better-ajv-errors#format):
   * [
   *   {
   *     start: { line: 6, column: 15, offset: 70 },
   *     end: { line: 6, column: 26, offset: 81 },
   *     error:
   *       '/content/0/type should be equal to one of the allowed values: panel, paragraph, ...',
   *     suggestion: 'Did you mean paragraph?',
   *   },
   * ];
   * */
  // How about passing invalid tests

  // If success
  if ( !output ) {
    return `${ colorize({message: `Passed:`, modifier: `success`}) } ${ file_path }`;
  }
  // If failure
  let msg = get_failure_msg_start({ file_path });
  for ( const error of output ) {
    msg += get_BAE_error_msg_body({ error, verbose: verbose === `true` })
  }
  return msg;
};

function get_failure_msg_start ({ file_path }) {
  /** Get the separator and heading of a failing test. */
  return (
    `\n`
    + colorize({ message: `------------------------`, modifier: `error` })
    + `\n${ colorize({ message: `Failed:`, modifier: `error` }) } in file ${ file_path }`
  )
}

function get_BAE_error_msg_body ({ error, verbose }) {
  /** Return the body of one Better Ajv Error's failure data.
   *  Different output based on how verbose the dev wants it. */
  // Better Ajv Errors are multi-line output. May want to remove extra spaces, though.
  if ( verbose ) {
    return error;
  }

  // Otherwise, short error
  // Make suggestion bold if there is one.
  let suggestion = error.suggestion || '';
  if ( suggestion ) { suggestion = ` **${ suggestion }**` }
  return (
    `\n${ error.error }.${ suggestion }`
    // Line numbers are only useful when yaml string are on the
    // same line as their key
    + `\n\x1b[90mLine ${ error.start.line }\x1b[0m`
  )
}

function get_AHE_error_msg_body ({ error }) {
  /** Return the body of one Ajv Human Error's failure data.
   *  Make sure each error is on its own line. */
  //
  return errors.message.replace(/\. /g, `.\n`);
}

function colorize ({ message, modifier }) {
  /** Add color to a message that will be put in the command prompt
   *  or browser console.
   *
   * See https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
   * See https://en.wikipedia.org/wiki/ANSI_escape_code#Colors
   *
   * @param message {str}
   * @param modifier {str} A string of the type of message
   *  (`error`, `success`, etc.) or a color/style string itself. */

  let color = modifier;
  if ( modifier === `error` ) {
    `bold \x1b[1m, fg red \x1b[31m`
    color = `\x1b[1m\x1b[31m`;
  } else if ( modifier === `success` ) {
    `fg green \x1b[32m`
    color = `\x1b[32m`;
  }
  // reset \x1b[0m
  return `${ color }${ message }\x1b[0m`;
}
