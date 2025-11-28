#!/usr/bin/env node
const yargs = require('yargs');
const {hideBin} = require('yargs/helpers');
const parser = require('../parser/parser.js');
const fs = require('fs');
const {Pool} = require('pg');

function getTimeString(date) {
    return date.toISOString().split('.')[0]+ 'Z';
}

async function writeRelationXML(row, pool, writeStream) {
    let subElements = "";
    let client;
    let tagResult, memberResult;
    const memberQuery = `WITH Combined AS  
(SELECT member_sequence, node_id AS id, role, 'node' AS type FROM relation_constituent_nodes WHERE relation_id=${row.id}
UNION ALL 
SELECT member_sequence, way_id AS id, role, 'way' AS type FROM relation_constituent_ways WHERE relation_id=${row.id})
SELECT * FROM Combined ORDER BY member_sequence ASC;
`;

    try {
        client = await pool.connect();
        tagResult = await client.query(`SELECT * FROM relation_tags WHERE relation_id=${row.id};`);
        memberResult = await client.query(memberQuery);
        await client.release();
    } catch (err) {
        console.error(`Could not query PostgreSQL server for node sub elements (${err}).\nNow exiting program...`);
        process.exit(1);
    }

    for (const memberRow of memberResult.rows) {
        subElements += `<member type="${memberRow.type}" ref="${memberRow.id}" role="${memberRow.role}"/>\n`;
    }

    for (const tagRow of tagResult.rows) {
        subElements += `<tag k="${tagRow.key}" v="${tagRow.value}"/>\n`;
    }

    let attributes = ""; 

    attributes += ` id="${row.id}" `;

    if (row.timestamp !== null) {
        attributes += ` timestamp="${getTimeString(row.timestamp)}" `;
    }

    if (row.uid !== null) {
        attributes += ` uid="${row.uid}" `;
    }

    if (row.usr !== null) {
        attributes += ` user="${row.usr}" `;
    }

    if (row.visible !== null) {
        attributes += ` visible="${row.visible}" `;
    }

    if (row.version !== null) {
        attributes += ` version="${row.version}" `;
    }

    if (row.changeset !== null) {
        attributes += ` changeset="${row.changeset}" `;
    }

    if (tagResult.rows.length === 0) {
        writeStream.write(`<relation${attributes}/>\n`);
    } else {
        writeStream.write(`<relation${attributes}>\n${subElements}</relation>\n`);
    }
}

async function writeWayXML(row, pool, writeStream) {
    let subElements = "";
    let client;
    let tagResult, ndResult;

    try {
        client = await pool.connect();
        tagResult = await client.query(`SELECT * FROM way_tags WHERE way_id=${row.id};`);
        ndResult = await client.query(`SELECT node_id FROM way_constituent_nodes WHERE way_id=${row.id} ORDER BY node_sequence ASC;`);
        await client.release();
    } catch (err) {
        console.error(`Could not query PostgreSQL server for node sub elements (${err}).\nNow exiting program...`);
        process.exit(1);
    }

    for (const ndRow of ndResult.rows) {
        subElements += `<nd ref="${ndRow.node_id}"/>\n`;
    }

    for (const tagRow of tagResult.rows) {
        subElements += `<tag k="${tagRow.key}" v="${tagRow.value}"/>\n`;
    }

    let attributes = ""; 

    attributes += ` id="${row.id}" `;

    if (row.timestamp !== null) {
        attributes += ` timestamp="${getTimeString(row.timestamp)}" `;
    }

    if (row.uid !== null) {
        attributes += ` uid="${row.uid}" `;
    }

    if (row.usr !== null) {
        attributes += ` user="${row.usr}" `;
    }

    if (row.visible !== null) {
        attributes += ` visible="${row.visble}" `;
    }

    if (row.version !== null) {
        attributes += ` version="${row.version}" `;
    }

    if (row.changeset !== null) {
        attributes += ` changeset="${row.changeset}" `;
    }

    if (tagResult.rows.length === 0) {
        writeStream.write(`<way${attributes}/>\n`);
    } else {
        writeStream.write(`<way${attributes}>\n${subElements}</way>\n`);
    }

}


async function writeNodeXML(row, pool, writeStream) {
    let subElements = "";
    let client;
    let tagResult;

    try {
        client = await pool.connect();
        tagResult = await client.query(`SELECT * FROM node_tags WHERE node_id=${row.id};`);
        await client.release();
    } catch (err) {
        console.error(`Could not query PostgreSQL server for node sub elements (${err}).\nNow exiting program...`);
        process.exit(1);
    }

    for (const tagRow of tagResult.rows) {
        subElements += `<tag k="${tagRow.key}" v="${tagRow.value}"/>\n`;
    }

    let attributes = ""; 

    attributes += ` id="${row.id}" `;

    if (row.lat !== null && row.lon !== null) {
        attributes += ` lat="${row.lat}" lon="${row.lon}" `;
    }
    
    if (row.timestamp !== null) {
        attributes += ` timestamp="${getTimeString(row.timestamp)}" `;
    }

    if (row.uid !== null) {
        attributes += ` uid="${row.uid}" `;
    }

    if (row.usr !== null) {
        attributes += ` user="${row.usr}" `;
    }

    if (row.visible !== null) {
        attributes += ` visible="${row.visible}" `;
    }

    if (row.version !== null) {
        attributes += ` version="${row.version}" `;
    }

    if (row.changeset !== null) {
        attributes += ` changeset="${row.changeset}" `;
    }

    if (tagResult.rows.length === 0) {
        writeStream.write(`<node${attributes}/>\n`);
    } else {
        writeStream.write(`<node${attributes}>\n${subElements}</node>\n`);
    }
}

async function saveAsXML(result, argv, pool) {
    let writeStream;

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

    console.log("Processing nodes...\n");

    for (const row of result.rows) {
        if (row.type === "node") {
            await writeNodeXML(row, pool, writeStream);
        } 
    }

    console.log("Processing ways...\n");

    for (const row of result.rows) {
        if (row.type === "way") {
            await writeWayXML(row, pool, writeStream);
        } 
    }

    console.log("Processing relations...\n");

    for (const row of result.rows) {
        if (row.type === "relation") {
            await writeRelationXML(row, pool, writeStream);
        } 
    }

    writeStream.write("</osm>\n");

    await pool.end();
}

function getSQLResults(sqlCode, argv) {
    const poolConfig = {
        host: argv.server,
        user: argv.username,
        max: 15,
        port: argv.port,
        password: argv.password,
        database: argv.database
    };

    const queries = sqlCode.split(';').slice(0,-1);

    const pool = new Pool(poolConfig);

    (async () => {
        let client;
        try {
            client = await pool.connect();   
        } catch (err) {
            console.error("Could not get client from pool.\nExiting program now...\n");
            process.exit(1);
        }

        let result;

        for (let i = 0; i < queries.length; i++) {
            try {
                if (i === queries.length - 1) {
                    result = await client.query(queries[i]);
                } else {
                    await client.query(queries[i]);
                }
            } catch (err) {
                console.error(`Could not submit SQL query (${err}).\nExiting program now...\n`);
            }
        }

        client.release();
        
        await saveAsXML(result, argv, pool);
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
    .command('run <input> <output>', 'Runs a Astrolabe program and returns OSM XML.', (yargs) => {
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
        .usage("run <input> <output> -s hostname -p port -d database -u username -w password")
        .help()
        .alias('help', 'h');
    }, run)
    .command('sql <input>', 'Shows the SQL query used to query the OSM data.', (yargs) => {
        return yargs.usage("sql <input>")
        .positional('input', {
            describe: "The Astrolabe query input file.",
            type: 'string'
        })
        .help()
        .alias('help', 'h');
    }, sql).alias('help', 'h')
    .parse();
