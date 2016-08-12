# Psuedocode for Graphic Object Monitoring

Check object on a given interval

 - Retrieve object to monitor
 - If object is first object, store then quit
 - Check for variance object, if it does not exist, make an object of Arrays with the same tree as the stored object
     - create a similarly structured object for the times
 - Analyze object in comparison to last object
     - Get properties
     - for each property, compare current value to last value
         - if property is an object, do analizing process then return
         - if they are equal, mark them as unchanged
         - if they are not equal, mark them as changed
         - if the property is changed, add the value and the current time to the variance object

Display changes on another given interval

 - Analyze variance object
     - Get properties
     - for each property, do `statistical operation`
         - if it is an object, do analizing process then return
         - if it is a value, do statistical operation and save
 - Post statistics to DOM
     - Get statistic object
     - Get main DOM parent
     - Get statistic object properties
     - Get DOM children
     - for each property, find its respective DOM element from the children
         - if property is object, repeat process
         - if property is null, leave element alone
         - if property is value, colorize element is based on the greatness of the value
     - Clear variance object
