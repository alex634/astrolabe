const yargs = require('yargs');
const {hideBin} = require('yargs/helpers');
const parser = require('../parser/parser.js');
const fs = require('fs');

function run(argv) {

}

function sql(argv) {
    fs.readFile(argv.input, 'utf-8', (err, data) => {
        if (err) {
            console.error(`Could not read file (${err})\nProgram is now exiting...\n`);
            process.exit(1);
        }
        console.log("SQL:\n\n")
        console.log(parser.parse(data));
    }) 
}

const argv = yargs(hideBin(process.argv))
    .scriptName("qastro")
    .usage("$0 <command> [options]")
    .command('run', 'Runs a Astrolabe program and returns OSM XML.', (yargs) => {
        return yargs.option('s', {
            alias: 'server',
            demandOption: true,
            default: "127.0.0.1",
            describe: "IP or hostname for Postgres server containing OSM data.",
            type: 'string'
        })
        .option('p', {
            alias: 'port',
            demandOption: true,
            default: 5432,
            describe: "Port for Postgres server containing OSM data.",
            type: 'number'
        })
        .option('d', {
            alias: 'database',
            demandOption: true,
            default: 'osm',
            describe: "The database on the Postgres server where the OSM data is stored.",
            type: "string"
        })
        .option('u', {
            alias: 'username',
            demandOption: true,
            describe: "The username under which the Postgres database should be accessed.",
            type: "string"
        })
        .option('w', {
            alias: 'password',
            demandOption: true,
            describe: "The password under which the Postgres database should be accessed.",
            type: "string"
        })
        .positional('input', {
            describe: "The Astrolabe query input file.",
            type: 'string'
        })
        .positional('output', {
            describe: "The OSM XML result output file.",
            type: 'string'
        })
        .help()
        .alias('help', 'h');
    }, run)
    .command('sql', 'Shows the SQL query used to query the OSM data.', (yargs) => {
        return yargs.positional('input', {
            describe: "The Astrolabe query input file.",
            type: 'string'
        })
        .help()
        .alias('help', 'h');
    }, sql).parse();