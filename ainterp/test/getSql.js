const parser = require('../parser/parser.js');

function main() {
    let input = "";
    
    console.log("Enter some Astrolabe code.\nPress ctrl-d when finished typing:\n");

    process.stdin.on("data", (data) => {
        input +=  data;
    });

    process.stdin.on("end", () => {
        console.log("Parsing data...");
        const sql = parser.parse(input);
        console.log(`Generated SQL:\n${sql}`);
    });
}

main();
