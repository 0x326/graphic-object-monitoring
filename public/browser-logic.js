// John Meyer
// August 3, 2016
// browser-logic.js
// Takes an Object and monitors it for changes

// Note: this software is heavily based on an Array of "cloned" Objects
// When analyzing the monitored object, this software creates additional objects
// These additional objects have the same tree as the original 
//  and replace properties with values to properties with notes about the values
// These additional objects are called "clones"
// These "clones" are stored in an Array and are passed recursively for each Object with the monitored Object
// This Array of "cloned" Objects consists of
//  - A "cloned" Object filled with boolean values to indicate whether the monitored Object has changed
//  - A "cloned" Object filled with Arrays of every new value to which the monitored Object has been changed
//  - A "cloned" Object filled with Arrays of every time a new value has been changed in the monitored Object
//      (corresponding with the former "cloned" Object)

'use strict';

var arrayOfObjectClones = undefined;
const INDEX_OF_OBJECT_LOG_IS_CHANGED = 0;
const INDEX_OF_OBJECT_LOG_OF_CHANGES = 1;
const INDEX_OF_OBJECT_LOG_OF_CHANGES_TIME = 2;

var lastObject = undefined;
var objectLogOfChanges = undefined;
var objectLofOfChangesTime = undefined;
// An iterator for the following function
var numberOfScans = 0;
function checkObject (objectToCheck)
{
    if (typeof arrayOfObjectClones == "undefined")
    {
        // Create clone of the object with the same tree structure and fill it with Arrays
        arrayOfObjectClones = [ { }, { }, { } ];
        arrayOfObjectClones = cloneObject(objectToCheck, function (arrayOfObjectClones, propertyName, objectToCheck) {
            if (typeof arrayOfObjectClones[INDEX_OF_OBJECT_LOG_IS_CHANGED] == "undefined")
                arrayOfObjectClones[INDEX_OF_OBJECT_LOG_OF_CHANGES] = {};
            if (typeof arrayOfObjectClones[INDEX_OF_OBJECT_LOG_OF_CHANGES] == "undefined")
                arrayOfObjectClones[INDEX_OF_OBJECT_LOG_OF_CHANGES] = {};
            if (typeof arrayOfObjectClones[INDEX_OF_OBJECT_LOG_OF_CHANGES_TIME] == "undefined")
                arrayOfObjectClones[INDEX_OF_OBJECT_LOG_OF_CHANGES_TIME] = {};
            
            arrayOfObjectClones[INDEX_OF_OBJECT_LOG_IS_CHANGED][propertyName] = null;
            arrayOfObjectClones[INDEX_OF_OBJECT_LOG_OF_CHANGES][propertyName] = [];
            arrayOfObjectClones[INDEX_OF_OBJECT_LOG_OF_CHANGES_TIME][propertyName] = [];
            return arrayOfObjectClones;
        }, arrayOfObjectClones);
    }
    if (typeof lastObject == "undefined")
    {
        lastObject = objectToCheck;
        return;
    }
    // Scan object for changes
    arrayOfObjectClones = scanObjectForChanges(objectToCheck, lastObject, arrayOfObjectClones, (new Date()).valueOf());
    numberOfScans++;
    // Update last value
    lastObject = objectToCheck;
    // Check to see if array is very large.  If it is, it is likely it is using a significant amount of memory
    if (numberOfScans > 10000)
    {
        purgeArrayOfClonedObjects();
        numberOfScans = 0;
    }
    return;
}

// `cloneObject` breaks an obect down into its properties and, should one of its properties be an object, will recurisively examine the children of that property as well
// `objectToCheck` accpets an Object, which this function will examine
// `task` accepts a Function, which is called for every value of the object being examined
//   Example tasks might be to create another object with different data types but with the same tree
//   Objects such as these are called "clones"
// `arrayOfObjectClones` accepts an Array of these "cloned" Objects
function cloneObject (objectToCheck, task, arrayOfObjectClones)
{
    // Setup default values
    arrayOfObjectClones = typeof(arrayOfObjectClones) == "undefined" ? [ { } ] : arrayOfObjectClones;
    // Check parameters
    if (typeof(objectToCheck) == "undefined")
        throw new TypeError("objectToCheck must be defined");
    if (typeof(task) != "function")
        throw new TypeError("task must be a function");
    if (!Array.isArray(arrayOfObjectClones))
        throw new TypeError("arrayOfObjectClones must be an Array");
    // Store parameters (they will be passed as `this` to the callback of .forEach)
    var parametersToPass = {objectToCheck: objectToCheck, task: task, arrayOfObjectClones: arrayOfObjectClones};
    // We received an object for inspection
    // Get its properties
    var objectProperties = Object.getOwnPropertyNames(objectToCheck);
    // For each property, examine it
    objectProperties.forEach(function (objectPropertyName, indexInObjectProperties) {
        // If it is not another object, just do the specific task
        if (typeof(this.objectToCheck[objectPropertyName]) != "object")
        {
            // Store the result of the task to the array of "cloned" objects
            this.arrayOfObjectClones = task(this.arrayOfObjectClones, objectPropertyName, this.objectToCheck);
        }
        // If it is an object, we need to inspect it just like the object we are currently inspecting
        else
        {
            // Since this property is an Object, we need to make an Object as this property in each object clone of the array
            // Since we cannot pass multiple children as one argument without making a new Array, we must pack the children into a new array
            var arrayOfObjectClonesChildren = [];
            var parametersToPass = {objectPropertyName: objectPropertyName, arrayOfObjectClonesChildren: arrayOfObjectClonesChildren};
            this.arrayOfObjectClones.forEach(function (objectClone, indexInArrayOfObjectClones) {
                // For each clone, create an Object as this property
                if (typeof objectClone[this.objectPropertyName] == "undefined")
                    objectClone[this.objectPropertyName] = Object();
                // Push it to the new array of these Object properties
                this.arrayOfObjectClonesChildren.push(objectClone[this.objectPropertyName]);
            }, parametersToPass);
            // Retrieve parameters that were passed (and that may have been changed)
            arrayOfObjectClonesChildren = parametersToPass.arrayOfObjectClonesChildren;
            // Analyze the children of property
            arrayOfObjectClonesChildren = cloneObject(this.objectToCheck[objectPropertyName], this.task, arrayOfObjectClonesChildren);
            // Now that we are done, unpack the children of the object clones
            var parametersToPass = {objectPropertyName: objectPropertyName, arrayOfObjectClonesChildren: arrayOfObjectClonesChildren};
            this.arrayOfObjectClones.forEach(function (objectClone, indexInArrayOfObjectClones) {
                // For we clone, save the data from the child array
                objectClone[this.objectPropertyName] = arrayOfObjectClonesChildren[indexInArrayOfObjectClones];
            }, parametersToPass);
        }
    }, parametersToPass);
    // Retrieve parameters that were passed (and that may have been changed)
    objectToCheck = parametersToPass.objectToCheck;
    arrayOfObjectClones = parametersToPass.arrayOfObjectClones;
    // Return clones
    return arrayOfObjectClones;
}

// `scanObjectForChanges` scans recursively an object in comparison to a previous version of that object
// `scanObjectForChanges` returns the Array of "cloned" Objects
// If a different value exists in the first object from the second object, `scanObjectForChanges` will log the time and the new value to the Array of "cloned" Objects
// `objectToCompare` is the current object, which is compared
// `objectToCompareAgainst` is the past object, which is compared against
// `arrayOfObjectClones` is the Array of "cloned" objects
// `startTime` accepts a numerical time when `objectToCompare` was collected
function scanObjectForChanges (objectToCompare, objectToCompareAgainst, arrayOfObjectClones, startTime)
{
    // Setup default values
    arrayOfObjectClones = typeof(arrayOfObjectClones) == "undefined" ? [ { } ] : arrayOfObjectClones;
    startTime = typeof startTime == "undefined" ? new Date.valueOf() : startTime;
    // Check parameters
    if (typeof(objectToCompare) == "undefined")
        throw new TypeError("objectToCheck must be defined");
    if (typeof(objectToCompareAgainst) == "undefined")
        throw new TypeError("objectToCompareAgainst must be a function");
    if (!Array.isArray(arrayOfObjectClones))
        throw new TypeError("arrayOfObjectClones must be an Array");
    if (typeof startTime != "number")
        throw new TypeError("startTime must be a number (to represent time)");
    // Store parameters (they will be passed as `this` to the callback of .forEach)
    var parametersToPass = {objectToCompare: objectToCompare, objectToCompareAgainst: objectToCompareAgainst, arrayOfObjectClones: arrayOfObjectClones, startTime: startTime};
    // We received an object for inspection
    // Get its properties
    var objectProperties = Object.getOwnPropertyNames(objectToCompare);
    objectProperties.forEach(function (objectPropertyName, indexInObjectProperties, objectProperties) {
        var lastObjectPropertyList = Object.getOwnPropertyNames(this.objectToCompareAgainst);
        // If there is a property that was present in the last object but is not here now
        // Declare that property as undefined in the present property list
        if (lastObjectPropertyList.indexOf(objectPropertyName) == -1)
            objectProperties[objectPropertyName] = undefined;
    }, parametersToPass);
    //TODO: Update this segment of code
    /*
    var lastObjectProperties = Object.getOwnPropertyNames(objectToCompareAgainst);
    lastObjectProperties.forEach(function (lastObjectPropertyName, indexInLastObjectProperties, lastObjectProperties) {
        var lastObjectPropertyList = Object.getOwnPropertyNames(this.objectToCompareAgainst);
        // If there is a property that was not present in the last object but is now
        // Declare that property as undefined in the last property list
        if (lastObjectPropertyList.indexOf(lastObjectPropertyName) == -1)
            lastObjectProperties[lastObjectPropertyName] = undefined;
    }, parametersToPass);*/
    
    // For each property, examine it
    objectProperties.forEach(function (objectPropertyName, indexInObjectProperties) {
        // If it is not another object, compare its value to the previous value
        if (typeof(this.objectToCompare[objectPropertyName]) != "object")
        {
            if (this.objectToCompare[objectPropertyName] == this.objectToCompareAgainst[objectPropertyName])
                // Set isChanged boolean to false
                this.arrayOfObjectClones[INDEX_OF_OBJECT_LOG_IS_CHANGED][objectPropertyName] = false;
            else
            {
                // Set isChanged boolean to true
                this.arrayOfObjectClones[INDEX_OF_OBJECT_LOG_IS_CHANGED][objectPropertyName] = true;
                // Log the change
                this.arrayOfObjectClones[INDEX_OF_OBJECT_LOG_OF_CHANGES][objectPropertyName].push(this.objectToCompare[objectPropertyName]);
                this.arrayOfObjectClones[INDEX_OF_OBJECT_LOG_OF_CHANGES_TIME][objectPropertyName].push(this.startTime);
            }
        }
        // If it is an object, we need to inspect it just like the object we are currently inspecting
        else
        {
            // Since this property is an Object, we need to make an Object as this property in each object clone of the array
            // Since we cannot pass multiple children as one argument without making a new Array, we must pack the children into a new array
            var arrayOfObjectClonesChildren = [];
            var parametersToPass = {objectPropertyName: objectPropertyName, arrayOfObjectClonesChildren: arrayOfObjectClonesChildren};
            this.arrayOfObjectClones.forEach(function (objectClone, indexInArrayOfObjectClones) {
                // Push it to the new array of these Object properties
                this.arrayOfObjectClonesChildren.push(objectClone[this.objectPropertyName]);
            }, parametersToPass);
            // Retrieve parameters
            arrayOfObjectClonesChildren = parametersToPass.arrayOfObjectClonesChildren;
            // Analyze the children of property
            arrayOfObjectClonesChildren = scanObjectForChanges(this.objectToCompare[objectPropertyName], this.objectToCompareAgainst[objectPropertyName], arrayOfObjectClonesChildren, this.startTime);
            // Now that we are done, unpack the children of the object clones
            var parametersToPass = {objectPropertyName: objectPropertyName, arrayOfObjectClonesChildren: arrayOfObjectClonesChildren};
            this.arrayOfObjectClones.forEach(function (objectClone, indexInArrayOfObjectClones) {
                // For we clone, save the data from the child array
                objectClone[this.objectPropertyName] = arrayOfObjectClonesChildren[indexInArrayOfObjectClones];
            }, parametersToPass);
        }
    }, parametersToPass);
    // Retrieve parameters that were passed (and that may have been changed)
    objectToCompare = parametersToPass.objectToCompare;
    objectToCompareAgainst = parametersToPass.objectToCompareAgainst;
    arrayOfObjectClones = parametersToPass.arrayOfObjectClones;
    // Return clones
    return arrayOfObjectClones;
}

// `displayChanges` works through the arrayOfObjectClones recursively and builds a DOM tree to show what has changed
// `displayChanges` returns the Array of "cloned" Objects
// If the DOM tree does not exist or is incomplete, it will rebuild it
// `mathFunct` accepts a Function with two parameters, [any object], [Numerical Date]
// `mathFunct` should be a statistical operatoration that calculates the degree that which the particular value is changing
// `mathFunct` should return a percentage, though it could return anything as long as `colorize` accepts it
// `colorize` accepts a Function with two parameters, HTMLElement and a numerical percentage (or whatever `mathFunct` returns)
// `colorize` should modify the HTML element passed to it according to the degree at which the value represented by it is changing
// `arrayOfObjectClones` should accept the Array of "cloned" Objects
// 'htmlElement` accepts the HTMLElement that represents the object described by the Array of "cloned" Objects
function displayChanges (mathFunct, lastObject, arrayOfObjectClones, htmlElement, colorize)
{
    // Setup default values
    htmlElement = typeof htmlElement == "undefined" ? document.getElementById("rootObject") : htmlElement;
    
    // Check parameters
    if (typeof(mathFunct) != "function")
        throw new TypeError("mathFunct must be a Function");
    if (typeof lastObject == "undefined")
        throw new TypeError("lastObject must be defined");
    if (!Array.isArray(arrayOfObjectClones))
        throw new TypeError("arrayOfObjectClones must be an Array");
    if (typeof(htmlElement) != "object")
        throw new TypeError("htmlElement must be an HTML Element");
    if (typeof(colorize) != "function")
        throw new TypeError("colorize must be a function");
    
    // Explore arrayOfObjectClones[INDEX_OF_OBJECT_LOG_IS_CHANGED]
    var parametersToPass = {
        lastValue: lastObject,
        isChanged: arrayOfObjectClones[INDEX_OF_OBJECT_LOG_IS_CHANGED], 
        valueOfChanges: arrayOfObjectClones[INDEX_OF_OBJECT_LOG_OF_CHANGES], 
        timeOfChanges: arrayOfObjectClones[INDEX_OF_OBJECT_LOG_OF_CHANGES_TIME], 
        mathFunct: mathFunct, 
        htmlElement: htmlElement, 
        colorize: colorize };
    var objectProperties = Object.getOwnPropertyNames(arrayOfObjectClones[INDEX_OF_OBJECT_LOG_IS_CHANGED]);
    objectProperties.forEach(function (objectPropertyName, indexInObjectProperties) {
        // Find the HTML element containing this parent's children
        for (var htmlElementChildrenIndex = 0; htmlElementChildrenIndex < this.htmlElement.children.length && this.htmlElement.children[htmlElementChildrenIndex].className.indexOf("children") == -1; htmlElementChildrenIndex++)
            ;
        // Check to see if the loop found anything
        if (htmlElementChildrenIndex >= this.htmlElement.children.length)
        {
            // Loop was unable to find the correct element
            // It must not exist. Create a new one
            var childrenHtmlElement = document.createElement("div");
            childrenHtmlElement.className = "children";
            htmlElement.appendChild(childrenHtmlElement);
        }
        else
            // Loop found the element
            var childrenHtmlElement = this.htmlElement.children[htmlElementChildrenIndex];
        
        // Find this value's HTML element (which is under `childrenHtmlElement`)
        for (var childrenHtmlElementChildrenIndex = 0; childrenHtmlElementChildrenIndex < childrenHtmlElement.children.length && childrenHtmlElement.children[childrenHtmlElementChildrenIndex].getAttribute("propertyName") != objectPropertyName; childrenHtmlElementChildrenIndex++)
            ;
        // Check to see if the loop found anything
        if (childrenHtmlElementChildrenIndex >= childrenHtmlElement.children.length)
        {
            // Loop was unable to find the correct element
            // It must not exist. Create a new one
            var valueHtmlElement = document.createElement("div");
            valueHtmlElement.className = "object";
            valueHtmlElement.setAttribute("propertyName", objectPropertyName);
            //TODO: Create carrot
            var lastValue = this.lastValue[objectPropertyName];
            var textNode = document.createTextNode(objectPropertyName + " (" + typeof lastValue + "): " + lastValue);
            var childrenPlaceholder = document.createElement("div");
            childrenPlaceholder.className = "children";
            // Append items
            valueHtmlElement.appendChild(textNode);
            valueHtmlElement.appendChild(childrenPlaceholder);
            childrenHtmlElement.appendChild(valueHtmlElement);
            // Clean variables
            textNode = childrenPlaceholder = undefined;
        }
        else
            // Loop found the element
            var valueHtmlElement = childrenHtmlElement.children[childrenHtmlElementChildrenIndex];
        
        // Analyze value
        if (typeof this.isChanged[objectPropertyName] == "object" && this.isChanged[objectPropertyName] != null)
        {
            // It is an object. Let us examine it further
            // Pack children in the Array of Objects into a single Array
            var arrayOfObjectClonesChildren = Array();
            arrayOfObjectClonesChildren[INDEX_OF_OBJECT_LOG_IS_CHANGED] = this.isChanged[objectPropertyName];
            arrayOfObjectClonesChildren[INDEX_OF_OBJECT_LOG_OF_CHANGES] = this.valueOfChanges[objectPropertyName];
            arrayOfObjectClonesChildren[INDEX_OF_OBJECT_LOG_OF_CHANGES_TIME] = this.timeOfChanges[objectPropertyName];
            // Display changes in this object
            displayChanges(this.mathFunct, this.lastValue[objectPropertyName], arrayOfObjectClonesChildren, valueHtmlElement, this.colorize);
            //TODO: Add functionality to allow shading of Object so that the user knows to expand it
        }
        else if (this.isChanged[objectPropertyName])
        {
            // The value is changed
            var analysisOfChange = this.mathFunct(this.valueOfChanges[objectPropertyName], this.timeOfChanges[objectPropertyName]);
            // Update value
            var textNode = Array.prototype.find.call(valueHtmlElement.childNodes, function (value, index, array) {
                return value.nodeName == "#text"
            });
            textNode.nodeValue = objectPropertyName + " (" + typeof analysisOfChange.displayValue + "): " + analysisOfChange.displayValue;
            // Colorize based on degree of change
            this.colorize(valueHtmlElement, analysisOfChange);
        }
        else
        {
            // The value is not changed
            var analysisOfChange = {degreeOfChange: 0};
            // Remove colorization
            this.colorize(valueHtmlElement, analysisOfChange);
        }
    }, parametersToPass);
    
    return arrayOfObjectClones;
}
document.getElementById("userLinkToSaveData").onclick = function ()
{
    var blobSaverLink = document.getElementById("linkForBlobSaving");
    console.log("Purging arrayOfObjectClones");
    var json = JSON.stringify(arrayOfObjectClones),
        blob = new Blob([json], {type: "application/json"}),
        url = window.URL.createObjectURL(blob);
    blobSaverLink.href = url;
    blobSaverLink.download = "arrayOfObjectClones.json";
    blobSaverLink.click();
    window.URL.revokeObjectURL(url);
}
function purgeArrayOfClonedObjects ()
{
    var blobSaverLink = document.getElementById("linkForBlobSaving");
    console.log("Purging arrayOfObjectClones");
    var json = JSON.stringify(arrayOfObjectClones),
        blob = new Blob([json], {type: "application/json"}),
        url = window.URL.createObjectURL(blob);
    blobSaverLink.href = url;
    blobSaverLink.download = "arrayOfObjectClones.json";
    blobSaverLink.click();
    window.URL.revokeObjectURL(url);
    arrayOfObjectClones = undefined;
}

function analysisByStandardDeviation (arrayOfChangedValues, arrayOfTimeOfChangedValues) {
    // Define variables
    var hasUndefined, hasBoolean, hasNumber, hasString, hasSymbol, hasFunction, hasObject, hasNull;
    hasUndefined = hasBoolean = hasNumber = hasString = hasSymbol = hasFunction = hasObject = hasNull = false;
    var hasOnlyUndefined, hasOnlyBooleans, hasOnlyNumbers, hasOnlyStrings, hasOnlySymbols, hasOnlyFunctions, hasOnlyObjects, hasOnlyNull;
    hasOnlyUndefined = hasOnlyBooleans = hasOnlyNumbers = hasOnlyStrings = hasOnlySymbols = hasOnlyFunctions = hasOnlyObjects = hasOnlyNull = false;
    // See what kind of values are contained
    hasUndefined    = arrayOfChangedValues.every(function (value) {return typeof value == this;}, "undefined");
    hasBoolean      = arrayOfChangedValues.every(function (value) {return typeof value == this;}, "boolean");
    hasNumber       = arrayOfChangedValues.every(function (value) {return typeof value == this;}, "number");
    hasString       = arrayOfChangedValues.every(function (value) {return typeof value == this;}, "string");
    hasSymbol       = arrayOfChangedValues.every(function (value) {return typeof value == this;}, "symbol");
    hasFunction     = arrayOfChangedValues.every(function (value) {return typeof value == this;}, "function");
    hasObject       = arrayOfChangedValues.every(function (value) {return typeof value == this && value != null;}, "object");
    hasNull         = arrayOfChangedValues.every(function (value) {return typeof value == this && value == null;}, "object");
    
    hasOnlyUndefined = hasUndefined && !(                hasBoolean || hasNumber || hasString || hasSymbol || hasFunction || hasObject || hasNull)
    hasOnlyBooleans  = hasBoolean   && !(hasUndefined ||               hasNumber || hasString || hasSymbol || hasFunction || hasObject || hasNull);
    hasOnlyNumbers   = hasNumber    && !(hasUndefined || hasBoolean ||              hasString || hasSymbol || hasFunction || hasObject || hasNull);
    hasOnlyStrings   = hasString    && !(hasUndefined || hasBoolean || hasNumber ||              hasSymbol || hasFunction || hasObject || hasNull);
    hasOnlySymbols   = hasSymbol    && !(hasUndefined || hasBoolean || hasNumber || hasString ||              hasFunction || hasObject || hasNull);
    hasOnlyFunctions = hasFunction  && !(hasUndefined || hasBoolean || hasNumber || hasString || hasSymbol ||                hasObject || hasNull);
    hasOnlyObjects   = hasObject    && !(hasUndefined || hasBoolean || hasNumber || hasString || hasSymbol || hasFunction ||              hasNull);
    hasOnlyNull      = hasNull      && !(hasUndefined || hasBoolean || hasNumber || hasString || hasSymbol || hasFunction || hasObject           );
    // Make decision
    if (hasOnlyNumbers)
    {
        // Limit analysis to the last 20 values
        if (arrayOfChangedValues.length > 20)
        {
            var arrayOfChangedValuesToUse = [];
            for (var arrayIndex = (arrayOfChangedValues.length - 1) - 20; arrayIndex < arrayOfChangedValues.length; arrayIndex++)
            {
                arrayOfChangedValuesToUse.push(arrayOfChangedValues[arrayIndex]);
            }
        }
        else
            var arrayOfChangedValuesToUse = arrayOfChangedValues;
        // Find the sum
        var sumOfValues = arrayOfChangedValuesToUse.reduce(function (previousReturnValue, currentArrayValue) {
            return previousReturnValue += currentArrayValue;
        });
        // Get the average
        var averageValue = sumOfValues / arrayOfChangedValuesToUse.length;
        // Find the difference between each value and the average then square the result
        var squaredDifferenceArray = arrayOfChangedValuesToUse.map(function (value) {
            return Math.pow(value - averageValue, 2);
        });
        // Find the average of the squared difference
        var sumOfSquaredDifference = squaredDifferenceArray.reduce(function (previousReturnValue, currentArrayValue) {
            return previousReturnValue += currentArrayValue;
        });
        var averageSquaredDifference = sumOfSquaredDifference / squaredDifferenceArray.length;
        // Find the standard deviation
        var standardDeviation = Math.sqrt(averageSquaredDifference);
        
        var analysis = {displayValue: averageValue + " (Average)\t" + standardDeviation + " (Standard Deviation)", degreeOfChange: standardDeviation * 10};
    }
    else
    {
        console.warn("Don't know what to do with arrayOfChangedValues");
        var analysis = {displayValue: "something" + " (Average)", degreeOfChange: 0};
    }
    return analysis;
}

function colorizeWithGradient (htmlElement, analysisOfChange) {
    if (analysisOfChange.degreeOfChange == 0)
        htmlElement.setAttribute("style", "");
    else
    {
        var opacity = Math.min(analysisOfChange.degreeOfChange / 100, 1);
        //htmlElement.setAttribute("style", "background-image: linear-gradient(hsla(0, 100%, 50%, " + opacity + ") 0%, hsla(0, 100%, 25%, " + opacity + ") 100%);");
        htmlElement.setAttribute("style", "background-color: hsla(0, 100%, 50%, " + opacity + ")");
    }
}
/*
var testObject = {coord1: {x:1, y:2, z:3}, coord2: {x:3, y:4, z:5}, time:35.66, weather: "just right", goodToGo: true};
var testObject2 = {coord1: {x:4, y:4, z:3}, coord2: {x:5, y:4, z:6}, time:35.67, weather: "just right", goodToGo: false};
var testObject3 = {coord1: {x:5, y:3, z:5}, coord2: {x:2, y:5, z:4}, time:35.67, weather: "terrible", goodToGo: false};
checkObject(testObject);
checkObject(testObject2);
checkObject(testObject3);
*/
setInterval(function () {
    displayChanges(analysisByStandardDeviation, lastObject, arrayOfObjectClones, undefined, colorizeWithGradient);
}, 500);
