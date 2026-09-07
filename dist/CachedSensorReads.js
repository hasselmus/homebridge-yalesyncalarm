"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const YaleSyncPlatform_1 = require("./YaleSyncPlatform");
const yalesyncalarm_1 = require("yalesyncalarm");
function enableCachedSensorReads() {
    const yalePrototype = yalesyncalarm_1.Yale.prototype;
    yalePrototype.motionSensors = async function () {
        return this._motionSensors;
    };
    yalePrototype.contactSensors = async function () {
        return this._contactSensors;
    };
    yalePrototype.updateMotionSensor = async function (sensor) {
        return this._motionSensors[sensor.identifier];
    };
    yalePrototype.updateContactSensor = async function (sensor) {
        return this._contactSensors[sensor.identifier];
    };
}
function default_1(homebridge) {
    enableCachedSensorReads();
    YaleSyncPlatform_1.default(homebridge);
}
exports.default = default_1;
