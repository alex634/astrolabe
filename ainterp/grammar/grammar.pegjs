{{

}}

start =
    statements !.

statements = statement statements
/ statement

statement = comment_statement
/ declaration_statement
/ expression_statement
/ blank_statement

comment_statement = whitespace* "#" [^\r\n]* line_ending

blank_statement = whitespace* line_ending

declaration_statement = whitespace* "var" whitespace+ label whitespace* "=" whitespace* expression whitespace* line_ending

expression_statement = whitespace* expression whitespace* line_ending

expression = method_call
/ literal

method_call = label ("." label "(" parameters ")"))*

parameters = (whitespace* expression whitespace* ",")*
/ whitespace*

literal = string_literal
/ distance_literal
/ float_literal

string_literal = '"' ([^\r\n\\"] / '\\\\' / '\\"' / '\\r' / '\\n')* '"' {

}

distance_literal = number_literal ("km" / "m" / "mi" / "ft") {
    return {value: match[0], unit: match[1]};
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
