// TODO: dependentRequired, dependentSchemas, unevaluatedProperties
// TODO: oneOf makes test output unclear. Switch to if/then and
// we can be more explicit about what errors we expect to see.
// TODO: add `attachment code` to disallowing other `attachment...` types
// and put that disallowing in `questions`
// TODO: for siblings, include that they must have one of those
// TODO: Add invalid tests for `attachement...` related sibs
// if `attachement...` types are missing if they don't already exist
// TODO: For sibs, remove tests for multiple `attachment...` types -
// just put that in the `attachment...` types themselves
// TODO: add fail_attachment_raw-no_content_file that has valid
// other keys that it needs
// TODO: to `attachment...` sibs, note they don't need to require
// `question`, since `attachment...` type props do that already

/** If we get the error "TypeError: left.charCodeAt is not a function",
 * check node_modules/better-ajv-errors/src/validation-errors/enum.js
 * which is actually
 * node_modules/better-ajv-errors/lib/cjs/validation-errors/enum.js
 * to make sure `findBestMatch` calls `leven` with `value.toString`.
 * */

// Node
const fs = require(`fs`);
const { exec } = require(`child_process`);
// Other packages
const { globSync } = require(`glob`);
const yaml = require(`js-yaml`);
const Ajv = require(`ajv/dist/2020`);
const { default: betterAjvErrors } = require(`better-ajv-errors`);
// Ours
const schema = require(`./docassemble_schema.json`);


// Schema validator.
// We're keeping strict mode: https://ajv.js.org/strict-mode.html
const ajv = new Ajv({
  allErrors: true,  // For ajv-human-errors
  verbose: true,  // For ajv-human-errors
});
// Get the function that will validate the YAML blocks
const validate = ajv.compile(schema);


// Confirm these tests pass
const passer_paths = globSync(`./tests/valid/*/*.yml`);
const num_passers = passer_paths.length;
let num_passers_failing = 0;
for ( let file_path of passer_paths ) {
  const { passed, output_body } = run_test({ schema, file_path, validate });
  it(`${ file_path } passes`, () => {expect(output_body).toMatchSnapshot();});
}


// Confirm these tests fail
const failer_paths = globSync(`./tests/invalid/*/*.yml`);
const num_failers = failer_paths.length;
let num_failers_passing = 0;
for ( let file_path of failer_paths ) {
  const { passed, output_body } = run_test({ schema, file_path, validate })
  it(`${ file_path } fails correctly`, () => {expect( output_body ).toMatchSnapshot();});
  // For new tests, snapshots will automatically be saved so
  // it'll be hard to catch accidentally passing tests without
  // this to grab our attention. We do have to check them regardless,
  // but this will protect us a _little_ from our laziness.
  it(`fails`, () => { expect( passed ).toBe( false ); });
}


// ================================
// ================================
// === Helpers ===

function run_test ({ schema, file_path, validate }) {
  // Not sure validate is needed, maybe it can be global
  const blocks = yaml.load( fs.readFileSync( file_path, `utf8` ));
  const passed = validate( blocks );
  const options = get_options({ blocks });
  const unformatted_output = betterAjvErrors(schema, blocks, validate.errors, options);
  const output_body = format_BAE_error_bodies({ output: unformatted_output });
  return { passed, output_body };
}

function get_options ({ blocks }) {
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

function format_BAE_error_bodies ({ output }) {
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
    content += get_BAE_error_msg_body({ error_data })
  }
  return content;
}

// TODO: remove styles
function get_BAE_error_msg_body ({ error_data }) {
  /** Return the body of one Better Ajv Error's failure data. */

  // Make suggestion bold if there is one.
  let suggestion = error_data.suggestion || ``;
  if ( suggestion ) {
    suggestion = ` ${ suggestion }`;
  }
  return (
    // TODO: first new line here should be handled higher up
    `\n${ error_data.error }.${ suggestion }`
    // Line numbers are only useful when yaml string are on the
    // same line as their key
    + `\nLine ${ error_data.start.line }`
    // + `\n\x1b[90mLine ${ error_data.start.line }\x1b[0m`
  );
}
