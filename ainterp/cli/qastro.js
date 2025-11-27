const yargs = require('yargs');
const {hideBin} = require('yargs/helpers');
const parser = require('../parser/parser.js');
const fs = require('fs');
const {Pool} = require('pg');

function getTimeString(date) {
    return date.toISOString().split('.')[0]+ 'Z';
}

async function writeRelationXML(result, row, pool, writeStream, elementsLeft) {
    let subElements = "";
    let client;
    let tagResult, memberResult;
    const memberQuery = `WITH Combined AS  
(SELECT member_sequence, node_id AS id, role, 'node' AS type FROM relation_constituent_nodes
UNION ALL 
SELECT member_sequence, way_id AS id, role, 'way' AS type FROM relation_constituent_ways)
SELECT * FROM Combined ORDER BY member_sequence ASC;
`;

    try {
        client = await pool.connect();
        tagResult = await client.query(`SELECT * FROM relation_tags WHERE node_id=${row[0]};`);
        memberResult = await client.query(memberQuery);
        await client.end();
    } catch (err) {
        console.error("Could not query PostgreSQL server for relation sub elements.\nNow exiting program...");
        process.exit(1);
    }

    for (const memberRow of memberResult.rows) {
        subElements += `<member type="${row[3]}" ref="${row[0]}" role="${row[2]}"/>\n`;
    }

    for (const tagRow of tagResult.rows) {
        subElements += `<tag k="${tagRow[1]}" v="${tagRow[2]}"/>\n`;
    }

    let attributes = ""; 

    attributes += ` id="${row[0]}" `;

    if (row[3] !== null) {
        attributes += ` timestamp="${getTimeString(row[3])}" `;
    }

    if (row[4] !== null) {
        attributes += ` uid="${row[4]}" `;
    }

    if (row[5] !== null) {
        attributes += ` user="${row[5]}" `;
    }

    if (row[6] !== null) {
        attributes += ` visible="${row[6]}" `;
    }

    if (row[7] !== null) {
        attributes += ` version="${row[7]}" `;
    }

    if (row[8] !== null) {
        attributes += ` changeset="${row[8]}" `;
    }

    if (result.rows.length === 0) {
        writeStream.write(`<relation${attributes}/>\n`);
    } else {
        writeStream.write(`<relation${attributes}>\n${subElements}\n</relation>\n`);
    }

    writeStream.write(output);

    elementsLeft.relations -= 1;

    if (elementsLeft.relations === 0) {
        writeStream.end();
        console.log("OSM XML finished exporting successfully.\n");
    }
}

async function writeWayXML(result, row, pool, writeStream, elementsLeft) {
    let subElements = "";
    let client;
    let tagResult, ndResult;

    try {
        client = await pool.connect();
        tagResult = await client.query(`SELECT * FROM way_tags WHERE node_id=${row[0]};`);
        ndResult = await client.query(`SELECT node_id FROM way_constituent_nodes WHERE way_id=${row[0]} ORDER BY node_sequence ASC`);
        await client.end();
    } catch (err) {
        console.error("Could not query PostgreSQL server for way sub elements.\nNow exiting program...");
        process.exit(1);
    }

    for (const ndRow of ndResult.rows) {
        subElements += `<nd ref=${ndRow[0]}/>\n`;
    }

    for (const tagRow of tagResult.rows) {
        subElements += `<tag k="${tagRow[1]}" v="${tagRow[2]}"/>\n`;
    }

    let attributes = ""; 

    attributes += ` id="${row[0]}" `;

    if (row[3] !== null) {
        attributes += ` timestamp="${getTimeString(row[3])}" `;
    }

    if (row[4] !== null) {
        attributes += ` uid="${row[4]}" `;
    }

    if (row[5] !== null) {
        attributes += ` user="${row[5]}" `;
    }

    if (row[6] !== null) {
        attributes += ` visible="${row[6]}" `;
    }

    if (row[7] !== null) {
        attributes += ` version="${row[7]}" `;
    }

    if (row[8] !== null) {
        attributes += ` changeset="${row[8]}" `;
    }

    if (result.rows.length === 0) {
        writeStream.write(`<way${attributes}/>\n`);
    } else {
        writeStream.write(`<way${attributes}>\n${subElements}\n</way>\n`);
    }

    writeStream.write(output);
    elementsLeft.ways -= 1;

    if (elementsLeft.relations === 0) {
        for (const r of result.rows) {
            if (r[9] === "relation") {
                writeRelationXML(result, r, pool, writeStream, elementsLeft);
            }
        }
    }
}


async function writeNodeXML(result, row, pool, writeStream, elementsLeft) {
    let subElements = "";
    let client;
    let tagResult;

    try {
        client = await pool.connect();
        tagResult = await client.query(`SELECT * FROM node_tags WHERE node_id=${row[0]};`);
        await client.end();
    } catch (err) {
        console.error("Could not query PostgreSQL server for node sub elements.\nNow exiting program...");
        process.exit(1);
    }

    for (const tagRow of result.rows) {
        subElements += `<tag k="${tagRow[1]}" v="${tagRow[2]}"/>\n`;
    }

    let attributes = ""; 

    attributes += ` id="${row[0]}" `;

    if (row[1] !== null && row[2] !== null) {
        attributes += ` lat="${row[1].toFixed(7)}" lon="${row[2].toFixed(7)} `;
    }
    
    if (row[3] !== null) {
        attributes += ` timestamp="${getTimeString(row[3])}" `;
    }

    if (row[4] !== null) {
        attributes += ` uid="${row[4]}" `;
    }

    if (row[5] !== null) {
        attributes += ` user="${row[5]}" `;
    }

    if (row[6] !== null) {
        attributes += ` visible="${row[6]}" `;
    }

    if (row[7] !== null) {
        attributes += ` version="${row[7]}" `;
    }

    if (row[8] !== null) {
        attributes += ` changeset="${row[8]}" `;
    }

    if (result.rows.length === 0) {
        writeStream.write(`<node${attributes}/>\n`);
    } else {
        writeStream.write(`<node${attributes}>\n${subElements}\n</node>\n`);
    }

    writeStream.write(output);
    elementsLeft.nodes -= 1;

    if (elementsLeft.nodes === 0) {
        for (const r of result.rows) {
            if (r[9] === "way") {
                writeWayXML(result, r, pool, writeStream, elementsLeft);
            }
        }
    }
}

function saveAsXML(result, argv, pool) {
    let writeStream;
    let elementsLeft = {};

    try {
        writeStream = fs.createWriteStream(argv.output, {
            encoding: "utf-8",
            flag: "w"
        });

        writeStream.write('<osm version="0.6" generator="qastro">\n');
    } catch (err) {
        console.error("Failed attempt to open new output file and write the header.\nNow exiting the program...\n");
        process.exit(1);
    }

    elementsLeft.nodes = result.rows.reduce((acc, row) => {
        return acc + (row[9] === "node") ? 1: 0;
    }
    ,0);

    elementsLeft.ways = result.rows.reduce((acc, row) => {
        return acc + (row[9] === "way") ? 1: 0;
    }
    ,0);

    elementsLeft.relations = result.rows.reduce((acc, row) => {
        return acc + (row[9] === "relation") ? 1: 0;
    }
    ,0);

    for (const row of result.rows) {
        if (row[9] === "node") {
            writeNodeXML(result, row, pool, writeStream, elementsLeft);
        } 
    }    
}

function getSQLResults(sqlCode, argv) {
    const poolConfig = {
        host: argv.server,
        user: argv.username,
        max: 15,
        port: argv.port,
        password: argv.password
    };

    const queries = sqlCode.split(';').slice(0,-1);

    const pool = new Pool(poolConfig);

    (async () => {
        try {
            const client = await pool.connect();   
        } catch (err) {
            console.error("Could not get client from pool.\nExiting program now...\n");
            process.exit(1);
        }

        let result;

        for (let i = 0; i < queries.length; i++) {
            try {
                if (i === queries.length - 1) {
                    result = client.query(queries[i]);
                } else {
                    client.query(queries[i]);
                }
            } catch (err) {
                console.error("Could not submit SQL query.\nExiting program now...\n");
            }
        }

        client.end();
        
        saveAsXML(result, argv, pool);
    })();
}

function transpile(input, argv) {
    console.log("Code is now being transpiled...\n");
    let sqlCode = "";
   
    try {
        sqlCode = parser.parse(input);
    } catch (err) {
        console.error(`Code could not be transpiled to SQL.\nThere may be errors in your code.\nProgram is now exiting...\n`);
        process.exit(1);
    }

    console.log("SQL code has been generated...\n");
    getSQLResults(sqlCode, argv);
}

function run(argv) {
    fs.readFile(argv.input, 'utf-8', (err, data) => {
        if (err) {
            console.error(`Could not read file (${err})\nProgram is now exiting...\n`);
            process.exit(1);
        }

        console.log("Code was read in.\n");
        transpile(data, argv);
    });
}

function sql(argv) {
    fs.readFile(argv.input, 'utf-8', (err, data) => {
        if (err) {
            console.error(`Could not read file (${err})\nProgram is now exiting...\n`);
            process.exit(1);
        }
        console.log("SQL:\n\n")
        console.log(parser.parse(data));
    });
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
    }, sql).alias('help', 'h')
    .parse();