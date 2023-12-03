# docassemble_schema
Schema development for the docassemble platform. It can't pass tests on GitHub because of [a bug in `better-ajv-errors`](https://github.com/atlassian/better-ajv-errors/issues/180).

## Setup

When you pull this repo locally, you need to edit the node_modules/`better-ajv-errors` `node_modules/better-ajv-errors/lib/cjs/validation-errors/enum.js` `findBestMatch()` function to change `value` to `value.toString()` when calling `leven`.
