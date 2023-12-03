#!/usr/bin/env node

// TODO: dependentRequired, dependentSchemas, unevaluatedProperties

// Node
const fs = require(`fs`);
const { exec } = require(`child_process`);
// Other packages
const { globSync } = require(`glob`);
const yaml = require(`js-yaml`);
const Ajv = require(`ajv/dist/2020`);
// const { AggregateAjvError } = require(`@segment/ajv-human-errors`);
const { default: betterAjvErrors } = require(`better-ajv-errors`);
const snapshot = require(`jest-snapshot`);
// Ours
const schema = require(`./docassemble_schema.json`);


// TODO: Maybe loop collecting successes and failures into their own
// groups (both for just valid, then both for just invalid) and print
// in those groups? What if the tests actually exit unexpectedly in
// the middle? All that info would be lost.

// Developer command line arguments/flags
const dev_args = require(`minimist`)( process.argv.slice(2), {
  alias: {
    verbose: `v`,
    "errors-only": `e`,
  },
  default: {
    verbose: `false`,
    "errors-only": `false`,
  }
});
// Schema validator.
// We're keeping strict mode: https://ajv.js.org/strict-mode.html
const ajv = new Ajv({
  allErrors: true,  // For ajv-human-errors
  verbose: true,  // For ajv-human-errors
});
// Get the function that will validate the YAML blocks
const validate = ajv.compile(schema);


console.log(stylize({ message: `--- Positive tests (these YAML blocks should pass) ---`, styles: `important` }));
// Confirm these tests pass
const passer_paths = globSync(`./tests/valid/*/*.yml`);
const num_passers = passer_paths.length;
let num_passers_failing = 0;

let snapshot_data = null;
for ( let file_path of passer_paths ) {
  const { passed, output_body } = run_test({ schema, file_path, validate, dev_args })
  snapshot_data = output_body;
  const heading = get_msg_heading({ file_path, passed });
  if ( !passed ) { num_passers_failing += 1; }
  // Only log errors if that's what dev wants
  if ( dev_args[`errors-only`] === `true` ) {
    if ( !passed ) {
      console.log( heading + output_body );
    }
  // Otherwise log every message
  } else {
    console.log( heading + output_body );
  }
}

const snap_state = new snapshot.SnapshotState(`__snapshots__`, {
   updateSnapshot: `new`,  // `all` is another option
 })

// Create a snapshot
const snap = snapshot.toMatchSnapshot.bind({
 // testPath: ``,  // part of the final filename
 currentTestName: `snapshot_test`,  // also part of the final filename
 // Where the tests are stored
 snapshotState: snap_state,
});


// Execute the matcher
const result = snap(snapshot_data);
snap_state.save();

console.log( result );



// const passers_totals_msg = get_totals_msg({
//   total_tests: num_passers,
//   num_unexpected: num_passers_failing,
//   msg_end: `positive tests`
// });
// console.log(passers_totals_msg);


// console.log(stylize({ message: `\n--- Negative tests (these YAML blocks should fail) ---`, styles: `important` }));
// // Confirm these tests fail
// const failer_paths = globSync(`./tests/invalid/*/*.yml`);
// const num_failers = failer_paths.length;
// let num_failers_passing = 0;

// for ( let file_path of failer_paths ) {
//   const { passed, output_body } = run_test({ schema, file_path, validate, dev_args });
//   // TODO: Also fail with unexpected error
//   const met_expectations = !passed;
//   const heading = get_msg_heading({ file_path, passed: met_expectations });
//   if ( !met_expectations ) { num_failers_passing += 1; }
//   // Only log errors if that's what dev wants
//   if ( dev_args[`errors-only`] === `true` ) {
//     if ( passed ) {
//       console.log( heading + output_body );
//     }
//   // Otherwise log every message
//   } else {
//     console.log( heading + output_body );
//   }
// }

// const failers_totals_msg = get_totals_msg({
//   total_tests: num_failers,
//   num_unexpected: num_failers_passing,
//   msg_end: `negative tests`
// });
// console.log(failers_totals_msg);

// const all_totals_msg = get_totals_msg({
//   total_tests: num_passers + num_failers,
//   num_unexpected: num_passers_failing + num_failers_passing,
//   msg_end: `in total`
// });
// console.log(`\n============================\nSummary`);
// console.log(all_totals_msg);


// ================================
// ================================
// === Helpers ===

function run_test ({ schema, file_path, validate, dev_args }) {
  // Not sure validate is needed, maybe it can be global
  const blocks = yaml.load( fs.readFileSync( file_path, `utf8` ));
  const passed = validate(blocks);
  const options = get_options({ blocks, dev_args });
  const unformatted_output = betterAjvErrors(schema, blocks, validate.errors, options);
  const output_body = format_BAE_error_bodies({
    output: unformatted_output,
    dev_args,
  });
  // console.log(output_body);
  return { passed, output_body };
}

function get_options ({ blocks, dev_args }) {
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
    json: JSON.stringify(blocks, null, 2)
          .replace( /\n\s*\{/g, `{` )
          .replace( /\n\s*\[/g, `[` )
          .replace( /\n\s*}/g, `}` )
          .replace( /\n\s*]/g, `]` )
          .replace( /^(.)\n\s*/, `\$1` ),
    // Alternatively, get something that retains the yml to json line
    // number map - source map. Phind think it's pretty unfeasible:
    // https://www.phind.com/search?cache=c7fq6ftdav4tx8bnpegyj7j3
    // This issue, though, suggests something about using a listener
    // https://github.com/nodeca/js-yaml/issues/428, though it's old
    // jsyaml.safeLoad(file, { listener: callback })
    // https://github.com/nodeca/js-yaml/blob/aee620a20e85e651073ad8e6468d10a032f0eca8/lib/loader.js#L1380
    // https://github.com/nodeca/js-yaml/blob/aee620a20e85e651073ad8e6468d10a032f0eca8/lib/loader.js#L1539
  }
}

function get_msg_heading ({ file_path, passed }) {
  /** Get the separator and heading of a failing test. */
  if ( passed ) {
    return `${ stylize({ message: `Passed:`, styles: `success` }) } ${ file_path }`;
  } else {
    return (
      stylize({ message: `------------------------`, styles: `error` })
      + `\n${ stylize({ message: `Failed:`, styles: `error` }) } in file ${ file_path }`
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
    return `\n${ error_data }`;
  }

  // Otherwise, short error
  // Make suggestion bold if there is one.
  let suggestion = error_data.suggestion || '';
  if ( suggestion ) {
    suggestion = " " + stylize({ message: suggestion, styles: `important` })
  }
  return (
    `\n${ error_data.error }.${ suggestion }`
    // Line numbers are only useful when yaml string are on the
    // same line as their key
    + `\n` + stylize({ message: `Line ${ error_data.start.line }`, styles: `aside` })
    // + `\n\x1b[90mLine ${ error_data.start.line }\x1b[0m`
  );
}

// function get_AHE_error_msg_body ({ error_data }) {
//   /** Return the body of one Ajv Human Error's failure data.
//    *  Make sure each error is on its own line. */
//   //
//   return error_data.message.replace(/\. /g, `.\n`);
// }

function get_totals_msg ({ total_tests, num_unexpected, msg_end }) {
  /** Returns the message to show at the end of the tests */
  if ( num_unexpected > 0 ) {
    return (
      stylize({
        message: `--------------\n${ num_unexpected }/${ total_tests } failing ${ msg_end }\n--------------`,
        styles: `error` })
    )
  } else {
    return (
      stylize({
        message: `--------------\n${ total_tests }/${ total_tests } passing ${ msg_end }\n--------------`,
        styles: `success` })
    )
  }
}

function stylize ({ message, styles }) {
  /** Add styles to a message that will be put in the command prompt
   *  or browser console.
   *
   * See https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
   * See https://en.wikipedia.org/wiki/ANSI_escape_code#Colors
   *
   * @param message {str}
   * @param styles {str} A string of the type of message
   *  (`error`, `success`, etc.) or a style string itself. */
  if ( styles === `error` ) {
    /* styles: */ `bold \x1b[1m, fg red \x1b[31m`
    styles = `\x1b[1m\x1b[31m`;
  } else if ( styles === `success` ) {
    /* styles: */ `fg green \x1b[32m`
    styles = `\x1b[32m`;
  } else if ( styles === `important` ) {
    /* styles: */ `bold \x1b[1m`
    styles = `\x1b[1m`;
  } else if ( styles === `aside` ) {
    /* styles: */ `fg gray \x1b[90m`
    styles = `\x1b[90m`;
  }
  // reset \x1b[0m
  return `${ styles }${ message }\x1b[0m`;
}
