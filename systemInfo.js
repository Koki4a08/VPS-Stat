const si = require('systeminformation');
const os = require('os');
const nodeOsUtils = require('node-os-utils');

async function getSystemInformation() {
  try {
    const [cpu, mem, osInfo, fsSize, diskLayout, networkInterfaces] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.osInfo(),
      si.fsSize(),
      si.diskLayout(),
      si.networkInterfaces()
    ]);

    const cpuUsage = await nodeOsUtils.cpu.usage();
    
    const uptime = os.uptime();
    const uptimeFormatted = formatUptime(uptime);
    
    const totalMemGb = (mem.total / 1024 / 1024 / 1024).toFixed(2);
    const usedMemGb = (mem.used / 1024 / 1024 / 1024).toFixed(2);
    const freeMemGb = (mem.free / 1024 / 1024 / 1024).toFixed(2);
    
    const mainDisk = fsSize.find(disk => disk.mount === '/') || fsSize[0];
    const mainDiskTotal = (mainDisk.size / 1024 / 1024 / 1024).toFixed(2);
    const mainDiskUsed = (mainDisk.used / 1024 / 1024 / 1024).toFixed(2);
    const mainDiskFree = (mainDisk.size - mainDisk.used) / 1024 / 1024 / 1024;
    
    let externalIp = 'Unable to retrieve';
    try {
      const ipResponse = await si.inetChecksite('https://api.ipify.org');
      if (ipResponse && ipResponse.status === 200) {
        externalIp = ipResponse.ip || 'Unable to retrieve';
      }
    } catch (error) {
      console.error('Error getting external IP:', error);
    }
    
    const activeInterface = networkInterfaces.find(iface => 
      iface.operstate === 'up' && 
      iface.type !== 'virtual' && 
      !iface.internal
    );
    
    const internalIp = activeInterface ? activeInterface.ip4 : 'Not available';
    
    return {
      hostname: os.hostname(),
      osInfo: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        kernel: osInfo.kernel,
        arch: osInfo.arch
      },
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        cores: cpu.cores,
        physicalCores: cpu.physicalCores,
        speed: cpu.speed,
        usage: cpuUsage
      },
      memory: {
        total: totalMemGb,
        used: usedMemGb,
        free: freeMemGb,
        usedPercent: (mem.used / mem.total * 100).toFixed(2)
      },
      disk: {
        total: mainDiskTotal,
        used: mainDiskUsed,
        free: mainDiskFree.toFixed(2),
        usedPercent: ((mainDisk.used / mainDisk.size) * 100).toFixed(2)
      },
      network: {
        internalIp,
        externalIp
      },
      uptime: uptimeFormatted
    };
  } catch (error) {
    console.error('Error getting system information:', error);
    throw error;
  }
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor(seconds % (3600 * 24) / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

module.exports = { getSystemInformation };