import originalPlugin from './YaleSyncPlatform'
import { Yale } from 'yalesyncalarm'

// Homebridge expects characteristic read handlers to answer quickly. The original
// plugin performs a fresh Yale authentication/device-status request for every
// motion/contact read, and all Yale operations are serialised behind one lock.
//
// Yale.update() already maintains complete in-memory sensor maps for the regular
// heartbeat. Use those snapshots for HomeKit sensor reads instead. Panel reads
// and writes, including arming/disarming, remain unchanged and continue to use
// the Yale API normally.
function enableCachedSensorReads() {
	const yalePrototype = Yale.prototype as any

	yalePrototype.motionSensors = async function() {
		return this._motionSensors
	}

	yalePrototype.contactSensors = async function() {
		return this._contactSensors
	}

	yalePrototype.updateMotionSensor = async function(sensor: any) {
		return this._motionSensors[sensor.identifier]
	}

	yalePrototype.updateContactSensor = async function(sensor: any) {
		return this._contactSensors[sensor.identifier]
	}
}

export default function(homebridge: any) {
	enableCachedSensorReads()
	originalPlugin(homebridge)
}
