import argparse
import psycopg2
import xml.etree.ElementTree as ET
from datetime import datetime
import time

createTableQuery = """
CREATE TABLE nodes (
    id BIGINT PRIMARY KEY NOT NULL,
    lat DECIMAL(9, 7),
    lon DECIMAL(10,7),
    timestamp TIMESTAMP(0),
    uid BIGINT,
    usr VARCHAR(255),
    visible BOOL,
    version BIGINT,
    changeset BIGINT
);CREATE TABLE ways (
    id BIGINT PRIMARY KEY NOT NULL,
    timestamp TIMESTAMP(0),
    uid BIGINT,
    usr VARCHAR(255),
    visible BOOL,
    version BIGINT,
    changeset BIGINT
);CREATE TABLE way_constituent_nodes (
    way_id BIGINT NOT NULL,
    node_sequence BIGINT NOT NULL CHECK(node_sequence > 0),
    node_id BIGINT NOT NULL,
    PRIMARY KEY (way_id, node_sequence),
    FOREIGN KEY (way_id) REFERENCES ways(id)
);CREATE TABLE relations (
    id BIGINT PRIMARY KEY NOT NULL,
    timestamp TIMESTAMP(0),
    uid BIGINT,
    usr VARCHAR(255),
    visible BOOL,
    version BIGINT,
    changeset BIGINT
);CREATE TABLE relation_constituent_nodes (
    relation_id BIGINT NOT NULL,
    member_sequence BIGINT NOT NULL CHECK(member_Sequence > 0),
    node_id BIGINT NOT NULL,
    role VARCHAR(255),
    PRIMARY KEY (relation_id, member_sequence),
    FOREIGN KEY (relation_id) REFERENCES relations(id)
);CREATE TABLE relation_constituent_ways (
    relation_id BIGINT NOT NULL,
    member_Sequence BIGINT NOT NULL CHECK(member_sequence > 0),
    way_id BIGINT NOT NULL,
    role VARCHAR(255),
    PRIMARY KEY(relation_id, member_sequence),
    FOREIGN KEY (relation_id) REFERENCES relations(id)
);CREATE TABLE node_tags (
    node_id BIGINT NOT NULL,
    key VARCHAR(255) NOT NULL,
    value VARCHAR(255),
    PRIMARY KEY (node_id, key),
    FOREIGN KEY (node_id) REFERENCES nodes(id)
);CREATE TABLE way_tags (
    way_id BIGINT NOT NULL,
    key VARCHAR(255) NOT NULL,
    value VARCHAR(255),
    PRIMARY KEY (way_id, key),
    FOREIGN KEY (way_id) REFERENCES ways(id)
);CREATE TABLE relation_tags (
    relation_id BIGINT NOT NULL,
    key VARCHAR(255) NOT NULL,
    value VARCHAR(255),
    PRIMARY KEY (relation_id, key),
    FOREIGN KEY (relation_id) REFERENCES relations(id)
);"""

def getCommandLine():
    parser = argparse.ArgumentParser()
    parser.add_argument("-i", "--input", type=str, help="The OSM input file to load into the database", required=True)
    parser.add_argument("-s", "--host", type=str, help="The host where the Postgresql server is located", required=True)
    parser.add_argument("-p", "--port", type=str, help="The port number where the Postgresql server is located", required=True)
    parser.add_argument("-d", "--database", type=str, help="The database to create the new tables", required=True)
    parser.add_argument("-w", "--password", type=str, help="The password to access the Postgresql database", required=True)
    parser.add_argument("-u", "--user", type=str, help="The username to access the Postgresql database", required=True)
    return parser.parse_args()

def postgresConnect(args):
    try:
        conn = psycopg2.connect(database=args.database, user=args.user, password=args.password,
        host=args.host, port=args.port)
    except:
        print("Database connection failed")
        quit(1)
       
    return conn

def iteratorXML(filename):
    iterator = None
    
    try:
        iterator = ET.iterparse(filename, events=("end", "start"))
    except:
        print("XML iterator could not be created for file")    
        quit(1)

    return iterator

def initializeTables(conn):
    try:
        cur = conn.cursor()
        for query in createTableQuery.split(";")[:-1]:
            cur.execute(query)
        conn.commit()
        cur.close()
    except Exception as e:
        print(f"Tables could not successfully be initialized: {e}")
        quit(1)

    print("Tables were initialized")

def booleanParser(string):
    match string:
        case "true":
            return True
        case "false":
            return False
        case None:
            return None

def nint(value):
    if value == None:
        return None
    
    return int(value)

def nfloat(value):
    if value == None:
        return None
    
    return float(value)

def addNodeTag(cur, id, tag):
    insertQuery = """
    INSERT INTO node_tags (node_id, key, value)
    VALUES (%s, %s, %s)
    """
    
    cur.execute(insertQuery, (id, tag.get("k"), tag.get("v")))

def addWayTag(cur, id, tag):
    insertQuery = """
    INSERT INTO way_tags (way_id, key, value)
    VALUES (%s, %s, %s)
    """
    
    cur.execute(insertQuery, (id, tag.get("k"), tag.get("v")))

def addRelationTag(cur, id, tag):
    insertQuery = """
    INSERT INTO relation_tags (relation_id, key, value)
    VALUES (%s, %s, %s)
    """
    
    cur.execute(insertQuery, (id, tag.get("k"), tag.get("v")))
    

def addNode(cur, element):
    insertQuery = """
    INSERT INTO nodes (id, lat, lon, timestamp, uid, usr, visible, version, changeset)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    
    timeFormat = "%Y-%m-%dT%H:%M:%SZ"   
 
    cur.execute(insertQuery, (nint(element.get("id")), nfloat(element.get("lat")), nfloat(element.get("lon")),
    datetime.strptime(element.get("timestamp"), timeFormat), nint(element.get("uid")), element.get("user"), 
    (booleanParser(element.get("visible"))), nint(element.get("version")), nint(element.get("changeset")) ) )
    
    for tag in element:
        addNodeTag(cur, nint(element.get("id")), tag)
    

def addWayConstituentNode(cur, way_id, node_id, sequenceNumber):
    insertQuery = """
    INSERT INTO way_constituent_nodes (way_id, node_sequence, node_id)
    VALUES (%s, %s, %s)
    """
    
    cur.execute(insertQuery, (way_id, sequenceNumber, node_id))

def addWay(cur, element):
    timeFormat = "%Y-%m-%dT%H:%M:%SZ"
    
    insertQuery = """
    INSERT INTO ways (id, timestamp, uid, usr, visible, version, changeset)
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    
    cur.execute(insertQuery, ( nint(element.get("id")), datetime.strptime(element.get("timestamp"), timeFormat), 
    nint(element.get("uid")), element.get("user"), booleanParser(element.get("visible")), nint(element.get("version")),
    nint(element.get("changeset"))  ) ) 
    
    nodeSequenceNumber = 1
    
    for child in element:
        match child.tag:
            case "nd":
                addWayConstituentNode(cur, nint(element.get("id")), nint(child.get("ref")), nodeSequenceNumber)
                nodeSequenceNumber += 1
            case "tag":
                addWayTag(cur, nint(element.get("id")), child)  

def addRelationConstituentNode(cur, relation_id, member_sequence, node_id, role):
    insertQuery = """
    INSERT INTO relation_constituent_nodes (relation_id, member_sequence, node_id, role)
    VALUES (%s, %s, %s, %s)
    """
    
    cur.execute(insertQuery, (relation_id, member_sequence, node_id, role))

def addRelationConstituentWay(cur, relation_id, member_sequence, way_id, role):
    insertQuery = """
    INSERT INTO relation_constituent_ways (relation_id, way_id, role)
    VALUES (%s, %s, %s, %s)
    """
    
    cur.execute(insertQuery, (relation_id, member_sequence, way_id, role))

def addRelation(cur, element):
    insertQuery = """
    INSERT INTO relations (id, timestamp, uid, usr, visible, version, changeset)
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    
    timeFormat = "%Y-%m-%dT%H:%M:%SZ"
    
    cur.execute(insertQuery, ( nint(element.get("id")), datetime.strptime(element.get("timestamp"), timeFormat),
    nint(element.get("uid")), element.get("user"), booleanParser(element.get("visible")),
    nint(element.get("version")), nint(element.get("changeset"))))
    
    seqeunceNumber = 1
    
    for child in element:
        match child.tag:
            case "member":
                if (child.get("type") == "node"):
                    addRelationConstituentNode(cur, nint(element.get("id")), sequenceNumber, nint(child.get("ref")), child.get("role"))
                    sequenceNumber += 1
                elif (child.get("type") == "way"):
                    addRelationConstituentWay(cur, nint(element.get("id")), sequenceNumber, nint(child.get("ref")), child.get("role"))
                    sequenceNumber += 1
            case "tag":
                addRelationTag(cur, nint(element.get("id")), child)

def fillTables(conn, iterator, inputFile, inputFileSize):
    cur = conn.cursor()
    processedCount = 0
    lastStatusTime = time.time()
    
    for event, element in iterator:
        if event == "start":
            if (element.tag == "osm"):
                if (element.get("version") != "0.6"):
                    print("OSM Data version must be 0.6")
        if event == "end": 
            match element.tag:
                case "node":
                    addNode(cur, element)
                    processedCount += 1
                    element.clear()
                case "way":
                    addWay(cur, element)
                    processedCount += 1
                    element.clear()
                case "relation":
                    addRelation(cur, element)
                    processedCount += 1
                    element.clear()
                case "tag" | "nd" | "member":
                    pass
                case _:
                    element.clear()
            
            if processedCount % 10000 == 0:
                if time.time() - lastStatusTime >= 10.0:
                    lastStatusTime = time.time()
                    print(f"{((inputFile.tell() / inputFileSize) * 100):.2f}%")
                conn.commit() 
    conn.commit()
                
    
def main():
    args = getCommandLine()
    conn = postgresConnect(args) 
    inputFileSize = None
    try:
        inputFile = open(args.input, "rb")
        inputFile.seek(0,2)
        inputFileSize = inputFile.tell()
        inputFile.seek(0)
    except Exception:
        print(f"Could not open file")
        quit(1)
    iterator = iteratorXML(inputFile)
    initializeTables(conn)
    fillTables(conn, iterator, inputFile, inputFileSize)
    conn.close()

main() 
