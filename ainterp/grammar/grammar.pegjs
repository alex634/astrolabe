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

string_literal = '"' ([^\r\n\\"] / '\\\\' / '\\"' / '\\r' / '\\n')* '"' 

distance_literal = number_literal ("km" / "m" / "mi" / "ft")

number_literal = [1-9] [0-9]*
/ "0"? "." [0-9]*
/ [1-9] [0-9]* "." [0-9]*

label = [a-zA-Z] [a-zA-Z0-9]*

whitespace = [ \t]

line_ending = ("\r")? "\n"
