# Dockerwatch-stats
Pulls container statistics and information from the Docker Remote API and sends them to dockerwatch-influx

## How to run
1. Clone the repo using ```git clone https://github.com/shanel262/dockerwatch-stats```
2. If InfluxDB is not accessible through localhost then insert the IP address in the client.js file where it says 'HOST'
3. Run ```npm start <container ID>``` to start the service.
