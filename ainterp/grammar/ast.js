class LabelNode {
    constructor(match) {
        this.string = (match[1] !== null) ? match[0] + match[1].join(): match[0];
    }
    
    evaluate() {
        return this.string
    }
}

class NumberLiteralNode {
    constructor(ruleNumber, match) {
        let numberString = "";
        
        switch(ruleNumber) {
            case 1:
                numberString = match[0] + ((match[1] !== null) ? match[1].join(): "");
            break;
            case 2:
                numberString = ((match[0]!==null) ? match[0]: "") + match[1] + ((match[2]!==null) ? match[2].join(): "");
            break;
            case 3:
                numberString = match[0] + ((match[1] !== null)? match[1].join(): "") + match[2] + ((match[3] !== null)? match[3].join(): "");
            break;
        }
        
        this.number = parseFloat(numberString);
    }
    
    evaluate() {
        return this.number;
    }
}

class DistanceLiteralNode {
    constructor(match) {
        this.distance = match[0]
        this.unit = match[1]
    }

    evaluate() {
        return {distance: this.distance, unit: this.unit};
    }
}


//Finish please
class StringLiteralNode {
    constructor(match) {
        
    }

    evaluate() {
        return this.string;
    }
}

class LiteralNode {
    constructor(ruleNumber, match) {
        switch(ruleNumber) {
            case 1:
                this.type = "string";
                this.value = match[0];
            break;
            case 2:
                this.type = "distance";
                this.value = match[0];
            break;
            case 3:
                this.type = "float";
                this.value = match[0];
            break;   
        }
    }
    
    evalutate() {
        return {type: this.type, value: this.value};
    }
}


