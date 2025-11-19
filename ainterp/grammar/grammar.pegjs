start =
    statements !. {
        return match[0].value;
    }

statements = (statement)* {
    const value = match.reduce((acc, statement) +> {
        return acc + statement.value;
    },
    "");

    return {type: "statements", value: value};
} 

statement = comment_statement {
    return {type: "statement", value: match[0].value};
}
/ declaration_statement {
    return {type: "statement", value: match[0].value};
}
/ expression_statement {
    return {type: "statement", value: match[0].value};
}
/ blank_statement {
    return {type: "statement", value: match[0].value};
}

comment_statement = whitespace* "#" [^\r\n]* line_ending {
    return {type: "comment_statement", value: ""};
}

blank_statement = whitespace* line_ending {
    return {type: "blank_statement", value: ""};
}

declaration_statement = whitespace* "var" whitespace+ label whitespace* "=" whitespace* expression whitespace* line_ending {
    if (match[7].variant === "literal") {
        console.error("Error: You may not declare a variable to be a literal. You can only store Nodes, Ways, and Relations in variables.");
        process.exit(1);
    }
    
    const nodes = `CREATE VIEW _var_nodes_${match[3].value} AS SELECT * FROM ${match[7].tables.nodes};\n` 
    const ways = `CREATE VIEW _var_ways_${match[3].value} AS SELECT * FROM ${match[7].tables.ways};\n`
    const relations = `CREATE VIEW _var_relations_${match[3].value} AS SELECT * FROM ${match[7].tables.relations};\n`
    
    return {type: "declaration_statement", value: match[7].value + nodes + ways + relations};
}


expression_statement = whitespace* expression whitespace* line_ending {
    if (match[1] === "method_call") {
        return {type: "expression_statement",  value: match[1].value};
    } 
}

parameters = (whitespace* expression whitespace* ",")*
/ whitespace*

// {type: "expression", variant: "literal", subvariant: "string_literal", value=""}
// {type: "expression", variant: "method_call", value: "", tables: {nodes: "", ways: "", relations: ""}}
expression = method_call
/ literal

method_call = label ("." label "(" parameters ")"))*

literal = string_literal {
    return {type: "literal", variant: "string_literal", value = match[0].value};
}
/ distance_literal {
    return {
        type: "literal", variant: "distance_literal", 
        value: match[0].value, unit: match[0].unit
    };
}
/ number_literal {
    return {type: "literal", variant: "number_literal", value: match[0].value};
}

string_literal = '"' ([^\r\n\\"] / '\\\\' / '\\"' / '\\r' / '\\n')* '"' {
    const processedValues = match[1].filter((value) => {
        switch(char) {
            case '\\\\':
                return '\\';
            break;
            case '\\"':
                return '\"';
            break;
            case '\\r':
                return '\r';
            break;
            case '\\n':
                return '\n';
            break;
            default:
                return value;
        }
    };

    return {type: "string_literal", value: processedValues.join()}; 
    );
}

distance_literal = number_literal ("km" / "m" / "mi" / "ft") {
    return {type: "distance_literal", value: match[0], unit: match[1]};
}

number_literal = [1-9] [0-9]* {
    return {
        type: "number_literal", 
        value: parseFloat(match[0] + ((match[1] !== null) ? match[1].join(): ""))
    };
}
/ "0"? "." [0-9]* {
    let numberString = (match[0] !== null) ? match[0]: "";
    numberString += ".";
    numberString += (match[2] !== null) ? match[2].join(): "";
    return {type: "number_literal", value: parseFloat(numberString)};
}
/ [1-9] [0-9]* "." [0-9]* {
    let numberString = match[0];
    numberString += (match[1] !== null) ? match[1].join(): "";
    numberString += ".";
    numberString += (match[3] !== null) ? match[3].join(): "";
    return {type: "number_literal", value: parseFloat(numberString)};
}

label = [a-zA-Z] [a-zA-Z0-9]* {
    return {
        type: "label",
        value: match[0] + ((match[1] !== null) ? match[1].join(): "")
    };
}

whitespace = [ \t]

line_ending = ("\r")? "\n"
