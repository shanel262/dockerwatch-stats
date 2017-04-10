var http = require('http')
var net = require('net')

var HOST = '127.0.0.1'
var PORT = 8001
var CONTAINERID = (process.argv[2] !== undefined) ? process.argv[2] : undefined

var client = new net.Socket()

var getContainerResourceUsage = {
	port: 8000,
	socketPath: '/var/run/docker.sock',
	host: '127.0.0.1',
	method: 'GET',
	path: '/containers/'+CONTAINERID+'/stats?stream=true'
}

var getContainerInfo = {
	port: 8000,
	socketPath: '/var/run/docker.sock',
	host: '127.0.0.1',
	method: 'GET',
	path: '/containers/'+CONTAINERID+'/json'	
}

sendContainerResourceUsage = function(res){
	var prevConCpu = 0
	var prevSysCpu = 0
	res.on('data', function(info){
		if(info){
			var stats = JSON.parse(info)
			if(stats){
				var currConCpu = stats.cpu_stats.cpu_usage.total_usage - prevConCpu
				var currSysCpu = stats.cpu_stats.system_cpu_usage - prevSysCpu
				prevConCpu = stats.cpu_stats.cpu_usage.total_usage
				prevSysCpu = stats.cpu_stats.system_cpu_usage
				var cpuUsedByCon = ((currConCpu / currSysCpu) * 100) * 2
				var memUsedByCon = ((stats.memory_stats.usage / stats.memory_stats.limit) * 100)
				var dataToSend = {
					id: CONTAINERID,
					cpu: cpuUsedByCon,
					mem: memUsedByCon,
					tag: 'Stats'
				}
				client.write(JSON.stringify(dataToSend))
			}
			else{
				console.log('No stats received from container')
			}
		}
	})
}

sendContainerInfo = function(res){
	res.on('data', function(info){
		if(info){
			var conInfo = JSON.parse(info)
			if(conInfo){
				console.log('conInfo:', conInfo.NetworkSettings.Ports)
				var dataToSend = {
					id: CONTAINERID,
					name: conInfo.Name,
					created: conInfo.Created,
					image: conInfo.Config.Image,
					restartCount: conInfo.RestartCount,
					state: JSON.stringify(conInfo.State),
					ipAddress: conInfo.NetworkSettings.IPAddress,
					port: (conInfo.NetworkSettings.Ports !== null) ? conInfo.NetworkSettings.Ports[Object.keys(conInfo.NetworkSettings.Ports)[0]][0].HostPort : '0',
					subnetAddress: conInfo.NetworkSettings.IPPrefixLen,
					macAddress: conInfo.NetworkSettings.MacAddress,
					tag: 'Info'
				}
				console.log('dataToSend:', dataToSend)
				client.write(JSON.stringify(dataToSend))
			}
		}
		else{
			console.log('No info received from container')
		}
		setInfoTimer()
	})
}

function setInfoTimer(){
	setTimeout(function() {
		console.log('Checking container information')
		var conInfo = http.request(getContainerInfo, sendContainerInfo)
		conInfo.end()
	}, 300000);
}

if(CONTAINERID !== undefined){
	client.connect(PORT, HOST, function(){
		console.log('CONNECTED TO SERVER: ' + HOST + ':' + PORT)
	})

	client.on('close', function(){
		console.log('CONNECTION CLOSED')
	})

	var init = http.request(getContainerResourceUsage, sendContainerResourceUsage)
	init.end()

	var conInfo = http.request(getContainerInfo, sendContainerInfo)
	conInfo.end()
}
else{
	(console.log('No container ID provided...Exiting'))
}
