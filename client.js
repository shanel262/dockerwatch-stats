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
	var prevConCpu = 0,
	 prevSysCpu = 0,
	 prevRxBytes = 0, //Received bytes
	 prevTxBytes = 0, //Transmitted bytes
	 prevRxPackets = 0,
	 prevTxPackets = 0,
	 prevRxDropped = 0,
	 prevTxDropped = 0,
	 prevRxError = 0,
	 prevTxError = 0
	res.on('data', function(info){
		if(info){
			var stats = JSON.parse(info)
			if(stats){
				// console.log('stats:', stats.networks)
				//CPU
				var currConCpu = stats.cpu_stats.cpu_usage.total_usage - prevConCpu
				var currSysCpu = stats.cpu_stats.system_cpu_usage - prevSysCpu
				prevConCpu = stats.cpu_stats.cpu_usage.total_usage
				prevSysCpu = stats.cpu_stats.system_cpu_usage
				var cpuUsedByCon = ((currConCpu / currSysCpu) * 100) * stats.cpu_stats.cpu_usage.percpu_usage.length
				//Memory
				var memUsedByCon = ((stats.memory_stats.usage / stats.memory_stats.limit) * 100)
				memLimit = stats.memory_stats.limit
				//Net Bytes
				var currentRxBytes = stats.networks.eth0.rx_bytes - prevRxBytes
				var currentTxBytes = stats.networks.eth0.tx_bytes - prevTxBytes
				prevRxBytes = stats.networks.eth0.rx_bytes
				prevTxBytes = stats.networks.eth0.tx_bytes
				//Net Packets
				var currentRxPackets = stats.networks.eth0.rx_packets - prevRxPackets
				var currentTxPackets = stats.networks.eth0.tx_packets - prevTxPackets
				prevRxPackets = stats.networks.eth0.rx_packets
				prevTxPackets = stats.networks.eth0.tx_packets
				//Net Dropped
				var currentRxDropped = stats.networks.eth0.rx_dropped - prevRxDropped
				var currentTxDropped = stats.networks.eth0.tx_dropped - prevTxDropped
				prevRxDropped = stats.networks.eth0.rx_dropped
				prevTxDropped = stats.networks.eth0.tx_dropped
				//Net Error
				var currentRxError = stats.networks.eth0.rx_errors - prevRxError
				var currentTxError = stats.networks.eth0.tx_errors - prevTxError
				prevRxError = stats.networks.eth0.rx_errors
				prevTxError = stats.networks.eth0.tx_errors
				//Pack it all up
				var dataToSend = {
					id: CONTAINERID,
					cpu: cpuUsedByCon,
					memPerc: memUsedByCon,
					memBytes: stats.memory_stats.usage,
					rxBytes: currentRxBytes,
					txBytes: currentTxBytes,
					rxPackets: currentRxPackets,
					txPackets: currentTxPackets,
					rxDropped: currentRxDropped,
					txDropped: currentTxDropped,
					rxError: currentRxError,
					txError: currentTxError,
					tag: 'Stats'
				}
				console.log('dataToSend:', dataToSend)
				client.write(JSON.stringify(dataToSend))
			}
			else{
				console.log('No stats received from container')
			}
		}
	})
}

var memLimit = 0

sendContainerInfo = function(res){
	res.on('data', function(info){
		if(info){
			var conInfo = JSON.parse(info)
			if(conInfo){
				// console.log('conInfo:', conInfo)
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
					memLimit: memLimit,
					tag: 'Info'
				}
				// console.log('dataToSend:', dataToSend)
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

	var conStats = http.request(getContainerResourceUsage, sendContainerResourceUsage)
	conStats.end()

	setTimeout(function() {
		var conInfo = http.request(getContainerInfo, sendContainerInfo)
		conInfo.end()
	}, 1000);
}
else{
	(console.log('No container ID provided...Exiting'))
}
