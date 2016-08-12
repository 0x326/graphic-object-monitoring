/*
function monitorObject (object)
{
    
}


function displayProperties (parentObject, parentHtmlElement)
{
    var properties = Object.getOwnPropertyNames(parentObject);
    properties.forEach(function (propertyName, indexInPropertyList, arrayOfPropertyNames) {
        // For each child, make a new element
        var childElement = propertyElement(propertyName, parentObject[propertyName]);
        // If it is an object, investigate it further
        if (typeof(parentObject[propertyName]) == "object")
        {
            childElement = displayProperties(parentObject[propertyName], childElement);
        }
        // Apend childElement to parent element's span element
        var parentsChildren = parentHtmlElement.getElementsByClassName("children");
        if (typeof(parentsChildren[0]) != "undefined")
            parentsChildren[0].appendChild(childElement);
    });
    return parentHtmlElement;
}*/

/*
function propertyElement (propertyName, propertyValue, hierarchy)
{
    var element = document.createElement("div");
    element.className = "object";
    element.id = hierarchy;
    var description = document.createTextNode(propertyName + ": " + propertyValue.valueOf());
    var childrenSpaceHolder = document.createElement("span");
    childrenSpaceHolder.className = "children";
    element.appendChild(description);
    element.appendChild(childrenSpaceHolder);
    return element;
}*/