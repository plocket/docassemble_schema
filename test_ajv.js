#!/usr/bin/env node

// TODO: dependentRequired, dependentSchemas, unevaluatedProperties

const { globSync } = require(`glob`);
const fs = require('fs');
const yaml = require('js-yaml');
const Ajv = require(`ajv/dist/2020`);
const { AggregateAjvError } = require(`@segment/ajv-human-errors`);
const { default: betterAjvErrors } = require('better-ajv-errors');
const chai = require(`chai`);
// Ours
const schema = require(`./docassemble_schema.json`);


// Developer command line arguments/flags
const dev_args = require(`minimist`)( process.argv.slice(2), {
  alias: { verbose: `v` },
  default: { verbose: `false` }
});

// Schema validator.
// We're keeping strict mode: https://ajv.js.org/strict-mode.html
const ajv = new Ajv({
  allErrors: true,  // For ajv-human-errors
  verbose: true,  // For ajv-human-errors
});

// Create function that will validate the given data
const validate = ajv.compile(schema);

// TODO: Maybe loop collecting successes and failures into their own
// groups (both for valid, then both for invalid) and print all at
// once? What if the tests actually exit in the middle?

console.log(stylize({ message: '--- Positive tests (these YAML blocks should pass) ---', modifier: `important` }));

// Confirm these tests pass
const passer_paths = globSync(`./tests/valid/*/*.yml`);
for ( let file_path of passer_paths ) {
  const { passed, output_body } = run_test({ schema, file_path, validate, dev_args })
  const heading = get_msg_heading({ file_path, passed });
  console.log( heading + output_body );
}

console.log(stylize({ message: '\n--- Negative tests (these YAML blocks should fail) ---', modifier: `important` }));

// Confirm these tests fail
const failer_paths = globSync(`./tests/invalid/*/*.yml`);
for ( let file_path of failer_paths ) {
  const { passed, output_body } = run_test({ schema, file_path, validate, dev_args })
  const heading = get_msg_heading({ file_path, passed: !passed });
  console.log( heading + output_body );
}

// // // Get list of errors with useful details
// // if (!valid) {
// //   // TODO: figure out which "path" is the longest and just print that
// //   // one. Or at least print that one first.
// //   console.error(stylize(`------------------------`, `error`));
// //   console.error(stylize({message: `Failed:`, modifier: `error`}), file_path);
// //   const errors = new AggregateAjvError(validate.errors);
// //   console.log(errors.message.replace(/\. /g, `.\n`));
// //   // console.log(validate.errors);
// // } else {
// //   console.log(stylize(`Passed:`, `success`), file_path);
// // }

function run_test ({ schema, file_path, validate, dev_args }) {
  // Not sure validate is needed, maybe it can be global
  const data = yaml.load( fs.readFileSync( file_path, `utf8` ));
  const passed = validate(data);
  const options = get_options({ data, dev_args });
  const unformatted_output = betterAjvErrors(schema, data, validate.errors, options);
  const output_body = format_BAE_error_bodies({
    output: unformatted_output,
    dev_args,
  });
  // console.log(output_body);
  return { passed, output_body };
}

function get_options ({ data, dev_args }) {
  // If verbose, make sure the json we output is pretty
  if ( dev_args.verbose === `true` ) {
    return { indent: 2 }
  }
  // Otherwise, return the options for more consise info
  return {
    format: `js`,
    // Make sure we get the right line numbers by changing
    // the json string. This only works if any yaml string
    // are on the same line as their key. (No `code: |`)
    json: JSON.stringify(data, null, 2)
          .replace( /\n\s*\{/g, `{` )
          .replace( /\n\s*\[/g, `[` )
          .replace( /\n\s*}/g, `}` )
          .replace( /\n\s*]/g, `]` )
          .replace( /^(.)\n\s*/, `\$1` ),
    // Alternatively, get something that retains the yml to json line
    // number map. Phind think it's pretty unfeasible:
    // https://www.phind.com/search?cache=c7fq6ftdav4tx8bnpegyj7j3
  }
}

function get_msg_heading ({ file_path, passed }) {
  /** Get the separator and heading of a failing test. */
  if ( passed ) {
    return `${ stylize({ message: `Passed:`, modifier: `success` }) } ${ file_path }`;
  } else {
    return (
      stylize({ message: `------------------------`, modifier: `error` })
      + `\n${ stylize({ message: `Failed:`, modifier: `error` }) } in file ${ file_path }`
    )
  }
}

function format_BAE_error_bodies ({ output, dev_args }) {
  /** Output one test's success or errors data.
   *
   * Data shape (https://github.com/atlassian/better-ajv-errors#format):
   * [{
   *   start: { line: 6, column: 15, offset: 70 },
   *   end: { line: 6, column: 26, offset: 81 },
   *   error: '/content/0/type should be equal to one of the allowed values: panel, paragraph, ...',
   *   suggestion: 'Did you mean paragraph?',
   * }, ...];
   * */
  // Get the bodies of all errors into one string
  let content = ``;
  for ( const error_data of output ) {
    content += get_BAE_error_msg_body({ error_data, verbose: dev_args.verbose === `true` })
  }
  return content;
}

function get_BAE_error_msg_body ({ error_data, verbose }) {
  /** Return the body of one Better Ajv Error's failure data.
   *  Different output based on how verbose the dev wants it. */
  // Normal Better Ajv Errors include JSON output.
  if ( verbose ) {
    return error_data;
  }

  // Otherwise, short error
  // Make suggestion bold if there is one.
  let suggestion = error_data.suggestion || '';
  if ( suggestion ) {
    suggestion = " " + stylize({ message: suggestion, modifier: `important` })
  }
  return (
    `\n${ error_data.error }.${ suggestion }`
    // Line numbers are only useful when yaml string are on the
    // same line as their key
    + `\n` + stylize({ message: `Line ${ error_data.start.line }`, modifier: `aside` })
    // + `\n\x1b[90mLine ${ error_data.start.line }\x1b[0m`
  );
}

// function get_AHE_error_msg_body ({ error_data }) {
//   /** Return the body of one Ajv Human Error's failure data.
//    *  Make sure each error is on its own line. */
//   //
//   return error_data.message.replace(/\. /g, `.\n`);
// }

function stylize ({ message, modifier }) {
  /** Add styles to a message that will be put in the command prompt
   *  or browser console.
   *
   * See https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
   * See https://en.wikipedia.org/wiki/ANSI_escape_code#Colors
   *
   * @param message {str}
   * @param modifier {str} A string of the type of message
   *  (`error`, `success`, etc.) or a style string itself. */

  let styles = modifier;
  if ( modifier === `error` ) {
    /* styles: */ `bold \x1b[1m, fg red \x1b[31m`
    styles = `\x1b[1m\x1b[31m`;
  } else if ( modifier === `success` ) {
    /* styles: */ `fg green \x1b[32m`
    styles = `\x1b[32m`;
  } else if ( modifier === `important` ) {
    /* styles: */ `bold \x1b[1m`
    styles = `\x1b[1m`;
  } else if ( modifier === `aside` ) {
    /* styles: */ `fg gray \x1b[90m`
    styles = `\x1b[90m`;
  }
  // reset \x1b[0m
  return `${ styles }${ message }\x1b[0m`;
}
