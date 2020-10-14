# node-red-contrib-ui-time-scheduler
A node-red ui time scheduler for the Node-RED Dashboard.

Install
-----------

You can install this node directly from the "Manage Palette" menu in the Node-RED interface.  
Alternatively, run the following command in your Node-RED user directory - typically `~/.node-red` on Linux or `%HOMEPATH%\.nodered` on Windows

        npm install node-red-contrib-ui-time-scheduler

Usage
----------

Add a time-scheduler-node to your flow. Open the dashboard and you will see an empty scheduler.  
Click the plus sign at the top right corner of the node the create a new schedule.

Examples
----------

You can find example flows and schedules within the examples folder.  
![](/images/fe_demo1.jpg)

History
----------

Version 0.2.2

update interval can now be changed (default 60s)

################

Version 0.2.1

improved node closing

################

Version 0.2.0

had to remove to ability to create "point in time" schedules  
might develop an extra node for this. The node now always  
outputs 'true' or 'false' every 60 seconds.

################

Version 0.1.3

updated help and readme

################

Version 0.1.0

new concept, new gui

################

Version 0.0.1

Initial release


# Thanks for your donation
You can donate by clicking the following link if you want to support this free project:

<a target="blank" href="https://www.paypal.me/fellinga"><img src="https://img.shields.io/badge/Donate-PayPal-blue.svg"/></a>