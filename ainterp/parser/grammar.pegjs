{{
    const methods = require('./methods.js');
}}

start =
    stmts:statements !. {
        let allVarDefinition = "CREATE TEMPORARY TABLE _var_nodes_all AS SELECT * FROM nodes;\n";
        allVarDefinition += "CREATE TEMPORARY TABLE _var_ways_all AS SELECT * FROM ways;\n";
        allVarDefinition += "CREATE TEMPORARY TABLE _var_relations_all AS SELECT * FROM relations;\n";
        return allVarDefinition + stmts.value;
    }

statements = stmts:(statement)* {
    const value = stmts.reduce((acc, statement) => {
        return acc + statement.value;
    },
    "");

    return {type: "statements", value: value};
} 


statement = expression:expression_statement {
    return {type: "statement", value: expression.value};

} / declaration:declaration_statement {
    return {type: "statement", value: declaration.value};

} / comment:comment_statement {
    return {type: "statement", value: comment.value};

} / blank:blank_statement {
    return {type: "statement", value: blank.value};
}

comment_statement = whitespace* "#" [^\r\n]* line_ending {
    return {type: "comment_statement", value: ""};
}

blank_statement = whitespace* line_ending {
    return {type: "blank_statement", value: ""};
}

declaration_statement = whitespace* "var" whitespace+ lbl:label whitespace* "=" whitespace* expr:expression whitespace* line_ending {
    if (expr.variant === "literal") {
        console.error("Error: You may not declare a variable to be a literal. You can only store Nodes, Ways, and Relations in variables.");
        process.exit(1);
    }
    
    const nodes = `CREATE TEMPORARY TABLE _var_nodes_${lbl.value} AS SELECT * FROM ${expr.tables.nodes};\n` 
    const ways = `CREATE TEMPORARY TABLE _var_ways_${lbl.value} AS SELECT * FROM ${expr.tables.ways};\n`
    const relations = `CREATE TEMPORARY TABLE _var_relations_${lbl.value} AS SELECT * FROM ${expr.tables.relations};\n`
    
    return {type: "declaration_statement", value: expr.value + nodes + ways + relations};
}


expression_statement = whitespace* expr:expression whitespace* line_ending {
    if (expr.variant === "method_call") {
        return {type: "expression_statement",  value: expr.value};
    }
    return {type: "expression_statement", value: ""}; 
}

// {type: "parameters", value: []}
parameters = whitespace* firstParm:expression whitespace*  restParms:("," whitespace* expression whitespace*)* {
    let value = [firstParm];
    for (let current of restParms) {
        value.push(current[2]);
    }

    return {type: "parameters", value: value};
}  
/ whitespace* {
    return {type: "parameters", value: []};
}

// {type: "expression", variant: "literal", subvariant: "string_literal", value=""}
// {type: "expression", variant: "method_call", value: "", tables: {nodes: "", ways: "", relations: ""}}
expression = method: method_call {
    return {
            type: "expression",
            variant: "method_call",
            value: method.value, 
            tables: {
                nodes: method.tables.nodes,
                ways: method.tables.ways,
                relations: method.tables.relations
            }
        };
}
/ ltrl:literal {
    return {type: "expression", variant: "literal", subvariant: ltrl.variant, value: ltrl.value};
}

method_call = variable:label calls:("." label "(" parameters ")")* {
    let methodObject = {
        type: "n/a", 
        value: "", 
        tables:{
            nodes:`_var_nodes_${variable.value}`, 
            ways: `_var_ways_${variable.value}`,
            relations: `_var_relations_${variable.value}`
        }
    };

    for (let call of calls) {
        if (call[1].value in methods) {
            methods[call[1].value](methodObject, call[3].value);
        } else {
            console.error(`Error: The method that was called ${call[1].value} does not exist`);
            process.exit(1);
        }
    }

    return {type: "method_call", value: methodObject.value, tables: {nodes: methodObject.tables.nodes, ways: methodObject.tables.ways, relations: methodObject.tables.relations}};

}


literal = string:string_literal {
    return {type: "literal", variant: "string_literal", value: string.value};
}
/ distance:distance_literal {
    return {
        type: "literal", variant: "distance_literal", 
        value: distance.value, unit: distance.unit
    };
}
/ number:number_literal {
    return {type: "literal", variant: "number_literal", value: number.value};
}

string_literal = '"' string:([^\r\n\\"] / '\\\\' / '\\"' / '\\r' / '\\n')* '"' {
    const processedValues = string.filter((value) => {
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
    });

    return {type: "string_literal", value: processedValues.join('')}; 
}

distance_literal = number:number_literal unit:("km" / "m" / "mi" / "ft") {
    return {type: "distance_literal", value: number, unit: unit};
}

number_literal = sign:"-"? leadingZero:"0"? "." postDecimalDigits:[0-9]* {
    let numberString = (sign !== null) ? sign: "";  
    numberString += (leadingZero !== null) ? leadingZero: "";
    numberString += ".";
    numberString += (postDecimalDigits !== null) ? postDecimalDigits.join(''): "";
    return {type: "number_literal", value: parseFloat(numberString)};
}
/ sign:"-"? leadingDigit:[1-9] remainingDigits:[0-9]* "." postDecimalDigits:[0-9]* {
    let numberString = (sign !== null) ? sign: "";  
    numberString += leadingDigit;
    numberString += (remainingDigits !== null) ? remainingDigits.join(''): "";
    numberString += ".";
    numberString += (postDecimalDigits !== null) ? postDecimalDigits.join(''): "";
    return {type: "number_literal", value: parseFloat(numberString)};
}
/ sign:"-"? leadingDigit:[1-9] remainingDigits:[0-9]* {
    return {
        type: "number_literal", 
        value: parseFloat(((sign !== null) ? sign: "") + leadingDigit + ((remainingDigits !== null) ? remainingDigits.join(''): ""))
    };
}

label = leadingChar:[a-zA-Z] remainingChars:[a-zA-Z0-9]* {
    return {
        type: "label",
        value: leadingChar + ((remainingChars !== null) ? remainingChars.join(''): "")
    };
}

whitespace = [ \t]

line_ending = ("\r")? "\n"
