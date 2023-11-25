#!/usr/bin/env node

const { globSync } = require(`glob`);
const { spawnSync } = require(`child_process`);

const original_args = process.argv.slice(2);
console.log(process.argv.slice(1));

// Quote your globs -d 'glob/path/*.yml'
const argv = require(`minimist`)( original_args, {
  alias: { data: `d` }
});

`
Example output:
argv: {
  _: [],
  valid: true,
  s: 'docassemble_schema.json',
  d: 'tests/valid/*/*.yml',
  data: 'tests/valid/*/*.yml',
  strict: 'false',
  spec: 'draft2020'
}
`

// `argv` will contain at least both `data` and `d` and
// we may extend it further
const original_keys = [];
for (let arg of original_args ) {
  // Get rid of any values
  const left_side = arg.replace(/=.*$/, ``);
  // If it's a key, strip dashes and keep it
  if ( left_side.startsWith(`-`) ) {
    original_keys.push( left_side.replace(/^--?/, '') );
  }
}
// console.log( `original_keys:`, original_keys );
// // original_args.filter(() => {});

const { _, ...no_underscore } = argv;

const safer_argv = {};
for ( let arg_key in no_underscore ) {
  // console.log( arg_key );
  if (original_keys.includes( arg_key )) {
    safer_argv[ arg_key ] = no_underscore[ arg_key ];
  }
}
// console.log(`safer_argv:`, safer_argv);

const paths = globSync(no_underscore.data, { ignore: 'node_modules/**' });
// console.log(paths);

// for ( let path of paths ) {
  const new_args = [`test`, ...Object.keys(safer_argv).map(arg => `--${arg}=${safer_argv[arg]}`)];
  console.log(`new_args:`, new_args.join(` `))

  // const new_args = Object.keys( safer_argv ).reduce((arg_list, key) => {
  //     arg_list.push(`--${ key }=${ safer_argv[key] }`);
  //     return arg_list;
  //   },
  //   [ `test` ]
  // );
  // console.log(`new_args:`, new_args);

  // not sure what to do with `_`



  // // Run the command
  // let result = spawnSync(
  //   `ajv`, new_args,
  //   // Prints messages from the process to the console while it's running
  //   { stdio: 'inherit', }
  // );

// }






