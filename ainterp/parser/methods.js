module.exports = methods;

/*
 * Two variables are passed whenever a method is called: methodObject, and parameters.
 * methodObject is more or less the object that the method is being called on.
 * methodObject is structured as such:
 * {
 *      type: "n/a",
 *      value: "...",
 *      tables: {
 *          nodes: "...",
 *          ways: "...",
 *          relations: "..."
 *      }
 * }
 * 
 * The 'type' key can be ignored.
 * The 'value' key contains the SQL used to generate the tables/views indicated in the
 * tables key. The keys in 'tables' each store the names of the tables/views containing the
 * current nodes, ways, and relations.
 * 
 * A method must edit the methodObject in place. The 'value' key is intended to
 * have new SQL appended to it. The names of the tables/views should be updated to reflect
 * what the current names of the tables/views storing the new nodes, ways, and relations.
 * 
 * The parameters variable is supposed to be the parameters passed to the method.
 * Parameters is an array of objects representing literals and the results of method calls.
 * These are what the literal objects can look like:
 * 
 * {type: "expression", variant: "literal", subvariant: "string_literal", value: "any string"}
 * {type: "expression", variant: "literal", subvariant: "distance_literal", value: 23.43, unit: "km"}
 * {type: "expression", variant: "literal", subvariant: "distance_literal", value: 9.2, unit: "mi"}
 * {type: "expression", variant: "literal", subvariant: "distance_literal", value: 3.23, unit: "ft"}
 * {type: "expression", variant: "literal", subvariant: "distance_literal", value: 13.04, unit: "m"}
 * {type: "expression", variant: "literal", subvariant: "number_literal", value: 0.238}
 * 
 * This is what the method call object looks like:
 * {
 *      type: "expression",
 *      variant: "method_call",
 *      value: "...",
 *      tables : {
 *          nodes: "...",
 *          ways: "...",
 *          relations: "..."
 *      }
 * }
 * 
 * This is structured the exact same way methodObject is, but you must not modify it.
 * 
 * You may make use of both methodObject and parameters as data sources to use to modify
 * methodObject.
 *  
*/

function generateName(type, methodName) {
    const ending = crypto.randomUUID().replaceAll('-', '_');

    switch (type) {
        case "nodes":
            return `_var_nodes_${method_name}_${ending}`;
        break;
        case "ways":
            return `_var_ways_${method_name}_${ending}`;
        break;
        case "relations":
            return `_var_relations_${method_name}_${ending}`;
        break;
    }
    
    return null;
}

const methods = {
    ways: function(methodObject, parameters) {
        if (parameters.length > 0) {
            console.error("Error: ways method cannot accept parameters");
            process.exit(1);
        }

        const nodesName = generateName("nodes", "ways");
        const waysName = generateName("ways", "ways");
        const relationsName = generateName("relations", "ways");        

        methodObject.value += `CREATE VIEW ${nodesName} AS SELECT * FROM ${methodObject.tables.nodes} WHERE 0 = 1;\n`
        methodObject.value += `CREATE VIEW ${waysName} AS SELECT * FROM ${methodObject.tables.ways};\n`; 
        methodObject.value += `CREATE VIEW ${relationsName} AS SELECT * FROM ${methodObject.tables.relations} WHERE 0 = 1;\n`

        methodObject.tables.nodes = nodesName;
        methodObject.tables.ways = waysName;
        methodObject.tables.relations = relationsName;
    },
    nodes: function(methodObject, parameters) {
        if (parameters.length > 0) {
            console.error("Error: nodes method cannot accept parameters");
            process.exit(1);
        }

        const nodesName = generateName("nodes", "nodes");
        const waysName = generateName("ways", "nodes");
        const relationsName = generateName("relations", "nodes");        

        methodObject.value += `CREATE VIEW ${nodesName} AS SELECT * FROM ${methodObject.tables.nodes};\n`
        methodObject.value += `CREATE VIEW ${waysName} AS SELECT * FROM ${methodObject.tables.ways} WHERE 0 = 1;\n`; 
        methodObject.value += `CREATE VIEW ${relationsName} AS SELECT * FROM ${methodObject.tables.relations} WHERE 0 = 1;\n`

        methodObject.tables.nodes = nodesName;
        methodObject.tables.ways = waysName;
        methodObject.tables.relations = relationsName;
    },
    relations: function(methodObject, parameters) {
        if (parameters.length > 0) {
            console.error("Error: relations method cannot accept parameters");
            process.exit(1);
        }

        const nodesName = generateName("nodes", "relations");
        const waysName = generateName("ways", "relations");
        const relationsName = generateName("relations", "relations");        

        methodObject.value += `CREATE VIEW ${nodesName} AS SELECT * FROM ${methodObject.tables.nodes} WHERE 0 = 1;\n`
        methodObject.value += `CREATE VIEW ${waysName} AS SELECT * FROM ${methodObject.tables.ways} WHERE 0 = 1;\n`; 
        methodObject.value += `CREATE VIEW ${relationsName} AS SELECT * FROM ${methodObject.tables.relations};\n`

        methodObject.tables.nodes = nodesName;
        methodObject.tables.ways = waysName;
        methodObject.tables.relations = relationsName;
    }
};