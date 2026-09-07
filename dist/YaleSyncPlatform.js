"use strict";
/*!
    MIT License

    https://github.com/jonathandann/homebridge-yalesyncalarm
    Copyright (c) 2019 Jonathan Dann

    Forked from https://github.com/jonathan-fielding/yalealarmsystem
    Copyright 2019 Jonathan Fielding, Jack Mellor & Adam Green

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const yalesyncalarm_1 = require("yalesyncalarm");
const YaleSyncPlatformConfig_1 = require("./YaleSyncPlatformConfig");
const Logger_1 = require("yalesyncalarm/dist/Logger");
const Model_1 = require("yalesyncalarm/dist/Model");
const Wait_1 = require("./Wait");
let Service;
let Characteristic;
let UUIDGenerator;
let Categories;
let PlatformAccessory;
let pluginName = 'homebridge-yalesyncalarm';
let platformName = 'YaleSyncAlarm';
function default_1(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGenerator = homebridge.hap.uuid;
    Categories = homebridge.hap.Accessory.Categories;
    PlatformAccessory = homebridge.platformAccessory;
    homebridge.registerPlatform(pluginName, platformName, YaleSyncPlatform, true);
}
exports.default = default_1;
function modeToCurrentState(mode) {
    switch (mode) {
        case "arm":
            return Characteristic.SecuritySystemCurrentState.AWAY_ARM;
        case "disarm":
            return Characteristic.SecuritySystemCurrentState.DISARMED;
        case "home":
            return Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
    }
}
function targetStateToString(state) {
    if (state === Characteristic.SecuritySystemTargetState.STAY_ARM) {
        return 'home';
    }
    else if (state === Characteristic.SecuritySystemTargetState.AWAY_ARM) {
        return 'away';
    }
    else if (state === Characteristic.SecuritySystemTargetState.NIGHT_ARM) {
        return 'night';
    }
    else if (state === Characteristic.SecuritySystemTargetState.DISARM) {
        return 'off';
    }
}
function currentStateToString(state) {
    if (state === Characteristic.SecuritySystemCurrentState.STAY_ARM) {
        return 'home';
    }
    else if (state === Characteristic.SecuritySystemCurrentState.AWAY_ARM) {
        return 'away';
    }
    else if (state === Characteristic.SecuritySystemCurrentState.NIGHT_ARM) {
        return 'night';
    }
    else if (state === Characteristic.SecuritySystemCurrentState.DISARMED) {
        return 'off';
    }
    else if (state === Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED) {
        return 'triggered';
    }
}
function targetStateToMode(targetState) {
    if (targetState === Characteristic.SecuritySystemTargetState.AWAY_ARM) {
        return "arm";
    }
    else if (targetState === Characteristic.SecuritySystemTargetState.DISARM) {
        return "disarm";
    }
    else {
        return "home";
    }
}
class YaleSyncPlatform {
    constructor(_log, config, _api) {
        this._log = _log;
        this._api = _api;
        this._accessories = {};
        try {
            const platformConfig = YaleSyncPlatformConfig_1.platformConfigDecoder.decodeAny(config);
            this._yale = new yalesyncalarm_1.Yale(platformConfig.username, platformConfig.password, new Logger_1.Logger(Logger_1.LogLevel.Info | Logger_1.LogLevel.Error, this._log));
            this._api.on('didFinishLaunching', async () => {
                await this.onDidFinishLaunching();
                const refreshInterval = platformConfig.refreshInterval;
                if (refreshInterval >= 1) {
                    this._log(`Refresh interval is ${refreshInterval} seconds, starting periodic updates`);
                    this.heartbeat(refreshInterval);
                }
                else {
                    this._log(`Refresh interval is < 1 second, periodic updates disabled`);
                }
            });
        }
        catch (error) {
            this._log(error.message);
        }
    }
    async heartbeat(interval) {
        var _a, _b, _c;
        if (this._yale === undefined) {
            return;
        }
        await Wait_1.default(interval * 1000);
        await this._yale.update();
        const [panel, motionSensors, contactSensors] = await Promise.all([
            await this._yale.panel(),
            await this._yale.motionSensors(),
            await this._yale.contactSensors(),
        ]);
        for (let [uuid, accessory] of Object.entries(this._accessories)) {
            if (accessory.context.kind === 'panel' && panel !== undefined) {
                if (accessory.identifier == panel.identifier) {
                    (_a = accessory
                        .getService(Service.SecuritySystem)
                        .getCharacteristic(Characteristic.SecuritySystemCurrentState)) === null || _a === void 0 ? void 0 : _a.setValue(modeToCurrentState(panel.state), undefined, 'no_recurse');
                }
            }
            else if (accessory.context.kind === 'motionSensor') {
                const motionSensor = motionSensors[accessory.context.identifier];
                if (motionSensor) {
                    (_b = accessory
                        .getService(Service.MotionSensor)
                        .getCharacteristic(Characteristic.MotionDetected)) === null || _b === void 0 ? void 0 : _b.setValue(motionSensor.state == Model_1.MotionSensor.State.Triggered ? true : false, undefined, 'no_recurse');
                }
            }
            else if (accessory.context.kind === 'contactSensor') {
                const contactSensor = contactSensors[accessory.context.identifier];
                if (contactSensor) {
                    (_c = accessory
                        .getService(Service.ContactSensor)
                        .getCharacteristic(Characteristic.ContactSensorState)) === null || _c === void 0 ? void 0 : _c.setValue(contactSensor.state == Model_1.ContactSensor.State.Closed
                        ? 0
                        : 1, undefined, 'no_recurse');
                }
            }
        }
        this.heartbeat(interval);
    }
    async onDidFinishLaunching() {
        if (this._yale === undefined) {
            return;
        }
        this._log('Searching for devices');
        await this._yale.update();
        const panel = await this._yale.panel();
        if (panel !== undefined) {
            this._log(`Discovered panel: ${panel.identifier}`);
            const uuid = UUIDGenerator.generate(`${pluginName}.${platformName}.panel.${panel.identifier}`);
            if (this._accessories[uuid] === undefined) {
                const accessory = new PlatformAccessory('Alarm System', uuid, Categories.SECURITY_SYSTEM);
                accessory.context.identifier = panel.identifier;
                accessory.context.kind = 'panel';
                this.configurePanel(accessory);
                this._log(`Registering alarm panel: ${panel.identifier}`);
                this._api.registerPlatformAccessories(pluginName, platformName, [
                    accessory,
                ]);
            }
            else {
                this._log(`Panel: ${panel.identifier} already registered with Homebridge`);
            }
        }
        const motionSensors = await this._yale.motionSensors();
        for (let [identifier, motionSensor] of Object.entries(motionSensors)) {
            this._log(`Discovered moton sensor: ${motionSensor.name}, ${motionSensor.identifier}`);
            const uuid = UUIDGenerator.generate(`${pluginName}.${platformName}.motionSensor.${identifier}`);
            if (this._accessories[uuid] === undefined) {
                const accessory = new PlatformAccessory(motionSensor.name, uuid, Categories.SENSOR);
                accessory.context.identifier = identifier;
                accessory.context.kind = 'motionSensor';
                this.configureMotionSensor(accessory);
                this._log(`Registering motion sensor: ${motionSensor.name} ${motionSensor.identifier}`);
                this._api.registerPlatformAccessories(pluginName, platformName, [
                    accessory,
                ]);
            }
            else {
                this._log(`Motion sensor: ${motionSensor.name} ${motionSensor.identifier} already registered with Homebridge`);
            }
        }
        const contactSensors = await this._yale.contactSensors();
        for (let [identifier, contactSensor] of Object.entries(contactSensors)) {
            this._log(`Discovered moton sensor: ${contactSensor.name} ${contactSensor.identifier}`);
            const uuid = UUIDGenerator.generate(`${pluginName}.${platformName}.contactSensor.${identifier}`);
            if (this._accessories[uuid] === undefined) {
                const accessory = new PlatformAccessory(contactSensor.name, uuid, Categories.SENSOR);
                accessory.context.identifier = identifier;
                accessory.context.kind = 'contactSensor';
                this.configureContactSensor(accessory);
                this._log(`Registering contact sensor: ${contactSensor.name} ${contactSensor.identifier}`);
                this._api.registerPlatformAccessories(pluginName, platformName, [
                    accessory,
                ]);
            }
            else {
                this._log(`Contact sensor: ${contactSensor.name} ${contactSensor.identifier} already registered with Homebridge`);
            }
        }
    }
    configureAccessory(accessory) {
        if (this._yale === undefined) {
            return;
        }
        if (this._accessories[accessory.UUID] === undefined) {
            if (accessory.context.kind === 'panel') {
                this.configurePanel(accessory);
            }
            else if (accessory.context.kind === 'motionSensor') {
                this.configureMotionSensor(accessory);
            }
            else if (accessory.context.kind === 'contactSensor') {
                this.configureContactSensor(accessory);
            }
        }
    }
    configureMotionSensor(accessory) {
        var _a;
        if (this._yale === undefined) {
            return;
        }
        if (this._accessories[accessory.UUID] === undefined) {
            const informationService = accessory.getService(Service.AccessoryInformation);
            informationService
                .setCharacteristic(Characteristic.Name, accessory.displayName)
                .setCharacteristic(Characteristic.Manufacturer, 'Yale')
                .setCharacteristic(Characteristic.Model, 'Motion Sensor')
                .setCharacteristic(Characteristic.SerialNumber, accessory.context.identifier);
            const sensorService = accessory.getService(Service.MotionSensor) !== undefined
                ? accessory.getService(Service.MotionSensor)
                : accessory.addService(Service.MotionSensor);
            (_a = sensorService
                .getCharacteristic(Characteristic.MotionDetected)) === null || _a === void 0 ? void 0 : _a.on('get', async (callback, context, connectionID) => {
                if (this._yale === undefined) {
                    callback(new Error(`${pluginName} incorrectly configured`));
                    return;
                }
                const motionSensors = await this._yale.motionSensors();
                const motionSensor = motionSensors[accessory.context.identifier];
                if (motionSensor !== undefined) {
                    this._log(`Fetching status of motion sensor: ${motionSensor.name} ${motionSensor.identifier}`);
                    const updated = await this._yale.updateMotionSensor(motionSensor);
                    if (updated !== undefined) {
                        this._log(`Motion sensor: ${motionSensor.name} ${motionSensor.identifier}, state: ${updated.state == Model_1.MotionSensor.State.Triggered
                            ? 'triggered'
                            : 'none detected'}`);
                        callback(null, updated.state == Model_1.MotionSensor.State.Triggered ? true : false);
                    }
                    else {
                        callback(new Error(`Failed to get status of motion sensor: ${motionSensor.name} ${motionSensor.identifier}`));
                    }
                }
                else {
                    callback(new Error(`Motion sensor: ${accessory.context.identifier} not found`));
                }
            });
        }
        this._accessories[accessory.UUID] = accessory;
    }
    configureContactSensor(accessory) {
        var _a;
        if (this._yale === undefined) {
            return;
        }
        if (this._accessories[accessory.UUID] === undefined) {
            const informationService = accessory.getService(Service.AccessoryInformation);
            informationService
                .setCharacteristic(Characteristic.Name, accessory.displayName)
                .setCharacteristic(Characteristic.Manufacturer, 'Yale')
                .setCharacteristic(Characteristic.Model, 'Contact Sensor')
                .setCharacteristic(Characteristic.SerialNumber, accessory.context.identifier);
            const sensorService = accessory.getService(Service.ContactSensor) !== undefined
                ? accessory.getService(Service.ContactSensor)
                : accessory.addService(Service.ContactSensor);
            (_a = sensorService
                .getCharacteristic(Characteristic.ContactSensorState)) === null || _a === void 0 ? void 0 : _a.on('get', async (callback, context, connectionID) => {
                if (this._yale === undefined) {
                    callback(new Error(`${pluginName} incorrectly configured`));
                    return;
                }
                const contactSensors = await this._yale.contactSensors();
                const contactSensor = contactSensors[accessory.context.identifier];
                if (contactSensor !== undefined) {
                    this._log(`Fetching status of contact sensor: ${contactSensor.name} ${contactSensor.identifier}`);
                    const updated = await this._yale.updateContactSensor(contactSensor);
                    if (updated !== undefined) {
                        this._log(`Contact sensor: ${contactSensor.name} ${contactSensor.identifier}, state: ${updated.state == Model_1.ContactSensor.State.Closed
                            ? 'closed'
                            : 'open'}`);
                        callback(null, updated.state == Model_1.ContactSensor.State.Closed
                            ? 0
                            : 1);
                    }
                    else {
                        callback(new Error(`Failed to get status of contact sensor: ${contactSensor.name} ${contactSensor.identifier}`));
                    }
                }
                else {
                    callback(new Error(`Contact sensor: ${accessory.context.identifier} not found`));
                }
            });
        }
        this._accessories[accessory.UUID] = accessory;
    }
    configurePanel(accessory) {
        var _a, _b, _c;
        if (this._yale === undefined) {
            return;
        }
        if (this._accessories[accessory.UUID] === undefined) {
            const informationService = accessory.getService(Service.AccessoryInformation);
            informationService
                .setCharacteristic(Characteristic.Name, accessory.displayName)
                .setCharacteristic(Characteristic.Manufacturer, 'Yale')
                .setCharacteristic(Characteristic.Model, 'Yale IA-320')
                .setCharacteristic(Characteristic.SerialNumber, accessory.context.identifier);
            const securitySystem = accessory.getService(Service.SecuritySystem) !== undefined
                ? accessory.getService(Service.SecuritySystem)
                : accessory.addService(Service.SecuritySystem);
            (_a = securitySystem
                .getCharacteristic(Characteristic.SecuritySystemCurrentState)) === null || _a === void 0 ? void 0 : _a.on('get', async (callback, context, connectionID) => {
                if (this._yale === undefined) {
                    callback(new Error(`${pluginName} incorrectly configured`));
                    return;
                }
                this._log(`Fetching panel state`);
                let panelMode = await this._yale.getPanelState();
                let panelState = modeToCurrentState(panelMode);
                this._log(`Panel mode: ${panelMode}, HomeKit state: ${currentStateToString(panelState)}`);
                callback(null, panelState);
            });
            (_c = (_b = securitySystem
                .getCharacteristic(Characteristic.SecuritySystemTargetState)) === null || _b === void 0 ? void 0 : _b.on('get', async (callback, context, connectionID) => {
                if (this._yale === undefined) {
                    callback(new Error(`${pluginName} incorrectly configured`));
                    return;
                }
                let panelState = await this._yale.getPanelState();
                callback(null, modeToCurrentState(panelState));
            })) === null || _c === void 0 ? void 0 : _c.on('set', async (targetState, callback, context, connectionID) => {
                if (this._yale === undefined) {
                    callback(new Error(`${pluginName} incorrectly configured`));
                    return;
                }
                if (context !== 'no_recurse') {
                    const mode = await this._yale.setPanelState(targetStateToMode(targetState));
                    this._log(`Panel mode: ${mode}, HomeKit state: ${currentStateToString(modeToCurrentState(mode))}`);
                    securitySystem.setCharacteristic(Characteristic.SecuritySystemCurrentState, modeToCurrentState(mode));
                    callback(null);
                }
            });
            this._accessories[accessory.UUID] = accessory;
        }
    }
}
//# sourceMappingURL=YaleSyncPlatform.js.map
