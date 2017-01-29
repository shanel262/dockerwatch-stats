var http = require('http')
var net = require('net')

var HOST = '127.0.0.1'
var PORT = 8001
var CONTAINERID = (process.argv[2] !== undefined) ? process.argv[2] : '2fd'

var client = new net.Socket()
client.connect(PORT, HOST, function(){
	console.log('CONNECTED TO SERVER: ' + HOST + ':' + PORT)
})

client.on('close', function(){
	console.log('CONNECTION CLOSED')
})

var getContainerInfo = {
	port: 8000,
	socketPath: '/var/run/docker.sock',
	host: '127.0.0.1',
	method: 'GET',
	path: '/containers/'+CONTAINERID+'/stats?stream=true'
}

listContainerInfo = function(res){
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
				var cpuUsedByCon = (currConCpu / currSysCpu) * 100
				var memUsedByCon = ((stats.memory_stats.usage / stats.memory_stats.limit) * 100)
				var dataToSend = {
					id: CONTAINERID,
					cpu: cpuUsedByCon,
					mem: memUsedByCon
				}
				client.write(JSON.stringify(dataToSend))
			}
			else{
				console.log('No stats received from container')
			}
		}
	})
}

var init = http.request(getContainerInfo, listContainerInfo)
init.end()