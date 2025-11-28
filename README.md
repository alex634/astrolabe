# Astrolabe

## Introduction

This is a geospatial querying language built to query OSM XML data. OverpassQL already exists for this purpose, but the syntax is overly complicated to achieve simple things. The goal of this language is to be much more simple for average people to use. Most functionality is provided through built-in methods rather than using complex syntatical features. As of now, this is a incomplete language in that it is missing many built-in methods and some syntactical feattures, but it is functional. OSM data can currently be returned.

## Usage

### Setting up the Database

Before the query interpreter can be used, a PostgreSQL database must be set up and loaded with OSM data. Since the full data set for OSM is incredibly large, it is suggested to use a small region. You can access specific regions from [Geofabrik.de](https://download.geofabrik.de/). Geofabrik's downloads are compressed, so it is suggest to use osmconvert to convert from `.osm.pbf` to `.osm` format. If it is necessary to combine two or more regions, it is also suggested to use `osmium`, specifically the `merge` subcommand.

Once suitable OSM data is ready, you may import it with a Python utility function provided in the utils folder (osmpsgldr.py). You only need to download the Python file to import, the rest of the repository does not need to be downloaded. Many systems will come with this, but you may have to install `psycopg2` with pip to be able to interface with a PostgreSQL server. The Python program will tell you what arguments to use if called with nothing, but the arguments are provided here for reference:

`usage: osmpsgldr.py [-h] -i INPUT -s HOST -p PORT -d DATABASE -w PASSWORD -u USER`
**INPUT**: OSM file to load into the database
**HOST**: The host in which the PostgreSQL database is being hosted
**PORT**: The port that the PostgreSQL server is bound to
**DATABASE**: The database where you want to store the tables
**PASSWORD**: The password for the PostgreSQL user
**USER**: The username for the PostgreSQL user

Before you can import any data, you must have access to a PostgreSQL server or you must have already configured and set one up locally.

Importing may take a long time. You will be provided with percentages showing progress during import.

### Using the Interpreter

To use the interpreter, you must install the interpreter package globally. To do this, run `npm install -g ainterp`. After having done this, you should now have access to a command named `qastro`. This interprets your code. It should be noted that this has terrible error reporting at the moment, but it does work.

qastro provides two subcommands: `sql` and `run`. Use the `-h` flag to get more information about usage. You probably will not ever need to use the sql subcommand. The intent of this is to show what SQL is executed on the backend for a given piece of code. The run subcommand takes two positional inputs: the input Astrolabe query file followed by the OSM XML output filename. In addition, you must provide information on how to access the SQL server through various flags (host, credentials, etc...). You may find out more about these flags by running `qastro run -h`.

### Writing Code

Given that the language is not fully complete, there are not many syntax elements that are necessary to learn.

**EXAMPLE CODE:**
```
var test = all.bbox(42.533761,1.582267,42.536797,1.586194)
test.output()
#This is a comment

```

**Line One**

The first line is a variable declaration:
`var test = all.bbox(42.533761,1.582267,42.536797,1.586194)`

All variable definitions start with "var" followed by a label. The label must follow this pattern: \[a-zA-Z\]\[a-zA-Z0-9\]\*. After the label, an "=" symbol must be placed. The variable assignment must be a method call on a variable. At this current time, there are no exceptions to this.

`.bbox(42.533761,1.582267,42.536797,1.586194)` is a method call. You may have noticed that `bbox` is being called on a variable that has not already been defined. The reason for this is that the "all" variable is predefined in all programs. It is the set of all nodes, ways, and relations in a database. What is happening here is that we are discarding all elements not within a geographic location. 

A method must be called on a variable or chained to another method. Not all methods take parameters, but if they do, they can either be a string, a number, a distance, or the output of a method call on a variable.

**Examples:**
`string` - "Hello World"
Notes:
- A backslash must be escaped using a backslash for a literal backslash.
- A quote must be escaped by a backslash for a literal quote.
- Carriage returns and newlines must be escaped as follows: "\\r" and "\\n"

`number` - -23409.23480
Notes:
- A number can be any floating point value.
- A number can have any sign.

`distance` - 514.92km
Notes:
- A distance is always a floating point value with a unit concatenated to the end
- The following units are allowed: km, m, mi, ft

**Line Two**

The second line is something that should be present in all programs. In every program you can only call the output method once on a variable. This tells the interpreter to dump the output of that variable into the OSM output file. There is not much else to say other than that.

**Line Three**

This is the third line: 
`#This is a comment`

Comments cannot be inline with code. They must be on their own separate line and start with a hash symbol.

**Line Four**

The fourth line is just a newline character. Because of how the grammar was designed, it is currently necessary to end all programs with a blank line. You may have as many blank lines as you want in the program, but the program must end with a blank line.

#### Methods

There are currently 5 methods:

`nodes()` - Gets all nodes within a variable.
`ways()` - Gets all ways within a variable.
`relations()` - Gets all relations within a variable
`bbox(<number>,<number>,<number>,<number>)` - Returns all nodes, ways, and relations with a variable that are within the bounds. The first number is the latitude of the south edge of the bound. The second number is the longitude of the west edge of the bound. The third number is the latitude of the north edge of the bound. The fourth number is the longitude of the east edge.
`output()` - Outputs the variable into an OSM XML file.


#### Grammar

The grammar provided is in the format used by Peggy.js:

```
start =
    stmts:statements !.

statements = stmts:(statement)* 

statement = expression:expression_statement
/ declaration:declaration_statement {
/ comment:comment_statement {
/ blank:blank_statement {

comment_statement = whitespace* "#" [^\r\n]* line_ending

blank_statement = whitespace* line_ending

declaration_statement = whitespace* "var" whitespace+ lbl:label whitespace* "=" whitespace* expr:expression whitespace* line_ending

expression_statement = whitespace* expr:expression whitespace* line_ending

parameters = whitespace* firstParm:expression whitespace*  restParms:("," whitespace* expression whitespace*)* 
/ whitespace*


expression = method: method_call 
/ ltrl:literal

method_call = variable:label calls:("." label "(" parameters ")")* 


literal = string:string_literal 
/ distance:distance_literal 
/ number:number_literal 

string_literal = '"' string:([^\r\n\\"] / '\\\\' / '\\"' / '\\r' / '\\n')* '"' 

distance_literal = number:number_literal unit:("km" / "m" / "mi" / "ft") 

number_literal = sign:"-"? leadingZero:"0"? "." postDecimalDigits:[0-9]* 
/ sign:"-"? leadingDigit:[1-9] remainingDigits:[0-9]* "." postDecimalDigits:[0-9]* 
/ sign:"-"? leadingDigit:[1-9] remainingDigits:[0-9]* 

label = leadingChar:[a-zA-Z] remainingChars:[a-zA-Z0-9]*

whitespace = [ \t]

line_ending = ("\r")? "\n"
```
