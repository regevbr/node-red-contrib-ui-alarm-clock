/*
MIT License

Copyright (c) 2020 Mario Fellinger

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

module.exports = function(RED) {
	'use strict';
	const sunCalc = require('suncalc');

	function HTML(config) {
		const uniqueId = config.id.replace(".", "");
		const divPrimary = "ui-ts-" + uniqueId;

		const styles = String.raw`
		<style>
			#${divPrimary} {
				padding-left: 6px;
				padding-right: 7px;
			}
			#${divPrimary} md-input-container {
				width: 100%;
			}
			#${divPrimary} md-select md-select-value {
				color: var(--nr-dashboard-widgetTextColor);
				border-color: var(--nr-dashboard-pageTitlebarBackgroundColor);
			}
			#${divPrimary} md-select[disabled] md-select-value, input[type="text"]:disabled {
				color: var(--nr-dashboard-widgetTextColor);
				opacity: 0.7;
			}
			#${divPrimary} .md-button {
				color: var(--nr-dashboard-widgetTextColor);
				background-color: var(--nr-dashboard-pageTitlebarBackgroundColor);
				min-width: 40px;
			}
			#${divPrimary} .md-subheader {
				top: -3px !important;
			}
			#${divPrimary} .md-subheader .md-subheader-inner {
				color: var(--nr-dashboard-widgetTextColor);
				background-color: var(--nr-dashboard-pageTitlebarBackgroundColor);
				padding: 6px 5px;
			}
			#${divPrimary} md-icon {
				color: var(--nr-dashboard-widgetTextColor);
			}
			#${divPrimary} md-progress-circular path {
				stroke: var(--nr-dashboard-widgetTextColor);
			}
			#${divPrimary} .weekDay {
				color: var(--nr-dashboard-widgetTextColor);
				background-color: var(--nr-dashboard-pageTitlebarBackgroundColor);
				width: 34px;
				line-height: 34px;
				display: inline-block;
				border-radius: 50%;
				opacity: 0.4;
			}
			#${divPrimary} .weekDayActive {
				opacity: 1;
			}
		</style>
		`;

		const alarmBody = String.raw`
		<div id="${divPrimary}" ng-init='init(${JSON.stringify(config)})'>
			<div layout="row" layout-align="space-between center" style="max-height: 50px;">
				<span flex="65" ng-show="alarm_names.length <= 1" style="height:50px; line-height: 50px;"> ${config.alarm_names[0]} </span>
				<span flex="65" ng-show="alarm_names.length > 1">
					<md-input-container>
						<md-select class="nr-dashboard-dropdown" ng-model="myAlarmSelect" ng-change="showStandardView()" aria-label="Select alarm" ng-disabled="isEditMode">
							<md-option value="overview"> ${RED._("alarm-clock.ui.overview")} </md-option>
							<md-option ng-repeat="alarm_name in alarm_names" value={{$index}}> {{alarm_names[$index]}} </md-option>
						</md-select>
					</md-input-container>
				</span>
				<span flex="35" layout="row" layout-align="end center" style="height: 50px;">
					<md-button style="width: 40px; height: 36px; margin-right: 4px;" aria-label="alarm enabled" ng-if="myAlarmSelect !== 'overview' && !isEditMode" ng-click="toggleAlarmStatus(myAlarmSelect)" >
						<md-icon> {{isAlarmEnabled(myAlarmSelect) ? "alarm_on" : "alarm_off"}} </md-icon>
					</md-button>
					<md-button style="width: 40px; height: 36px; margin: 0px;" aria-label="Add" ng-if="myAlarmSelect !== 'overview'" ng-click="toggleViews()" ng-disabled="loading">
						<md-icon> {{isEditMode ? "close" : "add"}} </md-icon>
					</md-button>
					<md-fab-speed-dial md-direction="down" class="md-scale" style="max-height: 36px;" ng-if="myAlarmSelect === 'overview'">
						<md-fab-trigger style="width: 84px;">
							<md-button aria-label="filter" style="width: 100%; margin: 0px;"><md-icon> filter_alt </md-icon></md-button>
						</md-fab-trigger>
						<md-fab-actions style="width: 84px;">
							<md-button aria-label="enabled" style="width: 100%; margin: 7px 0 0 0; border: 2px solid var(--nr-dashboard-groupBorderColor);" ng-click="changeFilter('enabled')" ng-disabled="overviewFilter != 'all'">
								${RED._("alarm-clock.ui.active")} <md-icon> {{overviewFilter === "all" ? "" : "check"}} </md-icon> 
							</md-button>
							<md-button aria-label="all" style="width: 100%; margin: 7px 0 0 0; border: 2px solid var(--nr-dashboard-groupBorderColor);" ng-click="changeFilter('all')" ng-disabled="overviewFilter == 'all'">
								${RED._("alarm-clock.ui.all")} <md-icon> {{overviewFilter === "all" ? "check" : ""}} </md-icon> 
							</md-button>
						</md-fab-actions>
					</md-fab-speed-dial>
				</span>
			</div>
			<div id="messageBoard-${uniqueId}" style="display:none;"> <p> </p> </div>
			<div id="overview-${uniqueId}" style="display:none;">
				<div ng-repeat="alarm_name in alarm_names track by $index">
					<md-list flex ng-cloak ng-if="(filteredAlarms = (getAlarmsByOverviewFilter() | filter:{ output: $index.toString() }:true)).length">
						<md-subheader> <span class="md-subhead"> {{alarm_names[$index]}} </span> </md-subheader>
						<md-list-item ng-repeat="alarm in filteredAlarms" style="min-height: 25px; height: 25px; padding: 0 2px;">
							<span style="overflow-x: hidden; {{(alarm.disabled || !isAlarmEnabled(alarm.output)) ? 'opacity: 0.4;' : ''}}">
								{{millisToTime(alarm.alarmtime)}}
							</span>
							<div class="md-secondary" style=" {{(alarm.disabled || !isAlarmEnabled(alarm.output)) ? 'opacity: 0.4' : ''}};">
								<span ng-repeat="day in days | limitTo : ${config.startDay}-7" ng-init="dayIndex=$index+${config.startDay}">{{alarm.days[localDayToUtc(alarm,dayIndex)]===1 ? ($index!==0 ? "&nbsp;" : "")+days[dayIndex] : ""}}</span>
								<span ng-repeat="day in days | limitTo : -${config.startDay}" ng-init="dayIndex=$index">{{alarm.days[localDayToUtc(alarm,dayIndex)]===1 ? ($index!==0 ? "&nbsp;" : "")+days[dayIndex] : ""}}</span>
							</div>
							<md-divider ng-if="!$last"></md-divider>
						</md-list-item>
					<md-list>
				</div>
				<div ng-if="alarms.length == 0">
					<p> ${RED._("alarm-clock.ui.emptyOverview")} <p>
				</div>
				<div ng-if="alarms.length != 0 && getAlarmsByOverviewFilter().length == 0">
					<p> ${RED._("alarm-clock.ui.noActiveOverview")} <p>
				</div>
			</div>
			<div id="alarmsView-${uniqueId}">
				<md-list flex ng-cloak style="text-align: center">
					<md-subheader>
						<div layout="row" class="md-subhead">
							<span flex=""> # </span>
							<span flex="45"></span>
							<span flex="40"> ${RED._("alarm-clock.ui.alarm")} </span>
						</div>
					</md-subheader>
					<md-list-item class="md-2-line" style="height: 74px; padding: 0 5px; border-left: 2px solid {{alarm.disabled ? 'red' : alarm.alarmSolarEvent ? '#FCD440' : 'transparent'}};" ng-repeat="alarm in alarms | filter:{ output: myAlarmSelect }:true track by $index">
						<div class="md-list-item-text" ng-click="showAddView(alarms.indexOf(alarm))" style="opacity:{{alarm.disabled ? 0.4 : 1}};">
							<div layout="row">
								<span flex=""> {{$index+1}} </span>
								<span flex="45"></span>
								<span flex="40"> {{millisToTime(alarm.alarmtime)}} </span>
							</div>
							<div layout="row" style="padding-top: 4px; padding-bottom: 4px;">
								<span flex="" ng-repeat="day in days | limitTo : ${config.startDay}-7" ng-init="dayIndex=$index+${config.startDay}">
									<span class="weekDay {{(alarm.days[localDayToUtc(alarm,dayIndex)]) ? 'weekDayActive' : ''}}"> {{days[dayIndex]}} </span>
								</span>
								<span flex="" ng-repeat="day in days | limitTo : -${config.startDay}" ng-init="dayIndex=$index">
									<span class="weekDay {{(alarm.days[localDayToUtc(alarm,dayIndex)]) ? 'weekDayActive' : ''}}"> {{days[dayIndex]}} </span>
								</span>
							</div>
						</div>
						<md-divider ng-if="!$last"></md-divider>
					</md-list-item>
				<md-list>
			</div>
			<div id="addAlarmView-${uniqueId}" style="display:none; position: relative;">
				<form ng-submit="addAlarm()" style="width: 100%; position: absolute;">
					<div ng-show="!showSunSettings">
						<div layout="row" layout-align="space-between none" style="max-height: 60px;">
							<md-input-container flex="50" ng-show="formalarm.alarmtype === 'custom'" style="margin-left: 0">
								<label style="color: var(--nr-dashboard-widgetTextColor)">${RED._("alarm-clock.ui.alarmtime")}</label>
								<input id="alarmTime-${uniqueId}" value="08:00" type="time" required pattern="^([0-1][0-9]|2[0-3]):([0-5][0-9])$">
								<span class="validity"></span>
							</md-input-container>
							<md-input-container flex="50" ng-if="formalarm.alarmtype !== 'custom'" style="margin-left: 0">
								<label style="color: var(--nr-dashboard-widgetTextColor)">${RED._("alarm-clock.ui.alarmtime")}</label>
								<input ng-model="formalarm.solarAlarmTimeLabel" type="text" required disabled>
								<span class="validity"></span>
							</md-input-container>
						</div>
						<div layout="row" style="max-height: 50px;">
							<md-input-container>
								<label style="color: var(--nr-dashboard-widgetTextColor)">${RED._("alarm-clock.ui.daysActive")}</label>
								<md-select class="nr-dashboard-dropdown" multiple="true" placeholder="${RED._("alarm-clock.ui.daysActive")}" ng-model="formalarm.dayselect" ng-change="daysChanged()" >
									<md-option value="all"><em>${RED._("alarm-clock.ui.selectAll")}</em></md-option>
									<md-option ng-repeat="day in days | limitTo : ${config.startDay}-7" ng-init="$index=$index+${config.startDay}" value={{$index}}> {{days[$index]}} </md-option>
									<md-option ng-repeat="day in days | limitTo : -${config.startDay}" value={{$index}}> {{days[$index]}} </md-option>
								</md-select>
							</md-input-container>
						</div>
						<div layout="row" layout-align="space-between end" style="height: 40px;">
							<md-button style="margin: 1px;" ng-if="formalarm.index !== undefined" ng-click="deleteAlarm()"> <md-icon> delete </md-icon> </md-button>
							<md-button style="margin: 1px;" ng-if="formalarm.index !== undefined" ng-click="formalarm.disabled=!formalarm.disabled">
								<md-icon> {{formalarm.disabled ? "alarm_off" : "alarm_on"}} </md-icon>
							</md-button>
							<span ng-if="formalarm.index === undefined" style="width: 40px;"></span> <span ng-if="formalarm.index === undefined" style="width: 40px;"></span>
							${config.solarEventsEnabled ? `<md-button style="margin: 1px;" aria-label="sunalarm" ng-click="showSunSettings=!showSunSettings"> <md-icon> wb_sunny </md-icon> </md-button>` : ``}
							<md-button style="margin: 1px" type="submit"> <md-icon> done </md-icon> </md-button>
						</div>
					</div>
					<div ng-show="showSunSettings">
						<div layout="row" style="height: 50px;">
							<md-input-container flex="60">
								<label style="color: var(--nr-dashboard-widgetTextColor)">Alarm type</label>
								<md-select class="nr-dashboard-dropdown" ng-model="formalarm.alarmtype" ng-change="updateSolarLabels()">
									<md-option value="custom" selected> ${RED._("alarm-clock.ui.custom")} </md-option>
									<md-option value="sunrise"> ${RED._("alarm-clock.ui.sunrise")} </md-option>
									<md-option value="sunriseEnd"> ${RED._("alarm-clock.ui.sunriseEnd")} </md-option>
									<md-option value="goldenHourEnd"> ${RED._("alarm-clock.ui.goldenHourEnd")} </md-option>
									<md-option value="solarNoon"> ${RED._("alarm-clock.ui.solarNoon")} </md-option>
									<md-option value="goldenHour"> ${RED._("alarm-clock.ui.goldenHour")} </md-option>
									<md-option value="sunsetStart"> ${RED._("alarm-clock.ui.sunsetStart")} </md-option>
									<md-option value="sunset"> ${RED._("alarm-clock.ui.sunset")} </md-option>
									<md-option value="dusk"> ${RED._("alarm-clock.ui.dusk")} </md-option>
									<md-option value="nauticalDusk"> ${RED._("alarm-clock.ui.nauticalDusk")} </md-option>
									<md-option value="night"> ${RED._("alarm-clock.ui.night")} </md-option>
									<md-option value="nadir"> ${RED._("alarm-clock.ui.nadir")} </md-option>
									<md-option value="nightEnd"> ${RED._("alarm-clock.ui.nightEnd")} </md-option>
									<md-option value="nauticalDawn"> ${RED._("alarm-clock.ui.nauticalDawn")} </md-option>
									<md-option value="dawn"> ${RED._("alarm-clock.ui.dawn")} </md-option>
								</md-select>
							</md-input-container>
							<md-input-container flex="40" ng-if="formalarm.alarmtype!='custom'">
								<label style="color: var(--nr-dashboard-widgetTextColor)">Offset (min)</label>
								<input type="number" ng-model="formalarm.alarmOffset" ng-change="offsetValidation()">
							</md-input-container>
						</div>
						<div layout="row" style="height: 50px;">
						</div>
						<div layout="row" layout-align="space-between end" style="height: 50px;">
							<md-button style="margin: 1px;" aria-label="sunalarm" ng-click="showSunSettings=!showSunSettings"> <md-icon> arrow_back </md-icon> </md-button>
						</div>
					</div>
				</form>
				<div ng-show="loading" layout="row" layout-align="center center" style="width:100%; position: absolute; z-index:10; opacity: 0.9; height:150px; background-color: var(--nr-dashboard-pageTitlebarBackgroundColor);">
					<md-progress-circular md-mode="indeterminate"></md-progress-circular>
				</div>
			</div>
		</div>
		`;

		return String.raw`${styles}${alarmBody}`;
	}

	function isCOnfigValid(config, node) {
		if (!config) {
			node.error(RED._("ui_alarm_clock.error.no-config"));
			return false;
		}
		if (!config.hasOwnProperty("group")) {
			node.error(RED._("ui_alarm_clock.error.no-group"));
			return false;
		}
		return true;
	}

	function AlarmClockNode(config) {
		try {
			const ui = RED.require("node-red-dashboard")(RED);

			RED.nodes.createNode(this, config);
			const node = this;

			// START check props
			if (!config.hasOwnProperty("refresh")) config.refresh = 60;
			if (!config.hasOwnProperty("startDay")) config.startDay = 0;
			if (!config.hasOwnProperty("height") || config.height === 0) config.height = 1;
			if (!config.hasOwnProperty("name") || config.name === "") config.name = "Alarm-Clock";
			if (!config.hasOwnProperty("alarm_names") || config.alarm_names.length === 0) config.alarm_names = [config.name];
			// END check props
			config.i18n = RED._("alarm-clock.ui", { returnObjects: true });
			config.solarEventsEnabled = ((config.lat !== "" && isFinite(config.lat) && Math.abs(config.lat) <= 90) && (config.lon !== "" && isFinite(config.lon) && Math.abs(config.lon) <= 180));

			if (!isCOnfigValid(config, node)) {
				return;
			}
			const done = ui.addWidget({
				node: node,
				format: HTML(config),
				templateScope: "local",
				group: config.group,
				width: config.width,
				height: Number(config.height) + 3,
				order: config.order,
				emitOnlyNewValues: false,
				forwardInputMessages: false,
				storeFrontEndInputAsState: true,
				persistantFrontEndValue: true,
				beforeEmit: function(msg, value) {
					if (msg.hasOwnProperty("disableAlarm")) {
						if (addDisabledAlarm(msg.disableAlarm)) {
							node.status({ fill: "green", shape: "ring", text: msg.disableAlarm + " " + RED._("alarm-clock.disabled") });
							msg.data = getNodeData();
							msg.payload = JSON.stringify(msg.data);
							node.send(msg);
						}
					} else if (msg.hasOwnProperty("enableAlarm")) {
						if (removeDisabledAlarm(msg.enableAlarm)) {
							node.status({ fill: "green", shape: "dot", text: msg.enableAlarm + " " + RED._("alarm-clock.enabled") });
							msg.data = getNodeData();
							msg.payload = JSON.stringify(msg.data);
							node.send(msg);
						}
					} else if (msg.hasOwnProperty("getStatus")) {
						msg.data = getNodeData();
						msg.payload = JSON.stringify(msg.data);
						node.send(msg);
						return msg;
					} else {
						try {
							const parsedInput = JSON.parse(value);

							const parsedAlarms = parsedInput.alarms;
							if (validateAlarms(parsedAlarms)) {
								node.status({ fill: "green", shape: "dot", text: "alarm-clock.payloadReceived" });
								setAlarms(parsedAlarms.filter(alarm => alarm.output < config.alarm_names.length));
							} else {
								node.status({ fill: "yellow", shape: "dot", text: "alarm-clock.invalidPayload" });
							}

							if (parsedInput.settings) setSettings(parsedInput.settings);
						} catch (e) {
							node.status({ fill: "red", shape: "dot", text: e.toString() });
						}
					}

					return { msg: [msg] };
				},
				beforeSend: function(msg, orig) {
					node.status({});
					if (orig && orig.msg[0]) {
						setAlarms(orig.msg[0].payload.alarms);
						setSettings(orig.msg[0].payload.settings);
						const sendMsg = JSON.parse(JSON.stringify(orig.msg));
						sendMsg[0].data = getNodeData();
						sendMsg[0].payload = JSON.stringify(msg.data);
						addOutputValues(sendMsg);
						return sendMsg;
					}
				},
				initController: function($scope) {
					$scope.init = function(config) {
						$scope.nodeId = config.id;
						$scope.i18n = config.i18n;
						$scope.days = config.i18n.days;
						$scope.alarm_names = config.alarm_names;
						$scope.myAlarmSelect = $scope.alarm_names.length > 1 ? "overview" : "0";
					}

					$scope.$watch('msg', function() {
						$scope.getAlarmsFromServer();
					});

					$scope.toggleViews = function() {
						$scope.isEditMode ? $scope.showStandardView() : $scope.showAddView();
					}

					$scope.showStandardView = function() {
						$scope.isEditMode = false;
						$scope.getElement("alarmsView").style.display = "block";
						$scope.getElement("messageBoard").style.display = "none";
						$scope.getElement("overview").style.display = "none";
						$scope.getElement("addAlarmView").style.display = "none";

						if (!$scope.alarms) {
							$scope.getElement("alarmsView").style.display = "none";

							const msgBoard = $scope.getElement("messageBoard");
							msgBoard.style.display = "block";
							msgBoard.firstElementChild.innerHTML = $scope.i18n.payloadWarning;
						} else if ($scope.myAlarmSelect === "overview") {
							$scope.getElement("alarmsView").style.display = "none";
							$scope.getElement("overview").style.display = "block";
						} else if ($scope.alarms.filter(alarm => alarm.output === $scope.myAlarmSelect).length === 0) {
							$scope.getElement("alarmsView").style.display = "none";

							const msgBoard = $scope.getElement("messageBoard");
							msgBoard.style.display = "block";
							msgBoard.firstElementChild.innerHTML = $scope.i18n.nothingPlanned;
						}
					}

					$scope.showAddView = function(alarmIndex) {
						$scope.isEditMode = true;
						$scope.showSunSettings = false;
						$scope.getElement("alarmsView").style.display = "none";
						$scope.getElement("messageBoard").style.display = "none";
						$scope.getElement("addAlarmView").style.display = "block";
						$scope.formalarm = { index: alarmIndex };
						$scope.formalarm.dayselect = [];
						$scope.formalarm.alarmtype = "custom";

						if (alarmIndex === undefined) {
							const today = new Date();
							if (today.getHours() === 23 && today.getMinutes() >= 54) today.setMinutes(53);
							const alarm = new Date(today.getFullYear(), today.getMonth(), today.getDay(), today.getHours(), today.getMinutes() + 1, 0);
							$scope.getElement("alarmTime").value = $scope.formatTime(alarm.getHours(), alarm.getMinutes());
							$scope.formalarm.dayselect.push(today.getDay());
							$scope.formalarm.disabled = false;
						} else {
							const alarm = $scope.alarms[alarmIndex];
							if (alarm.hasOwnProperty("alarmSolarEvent")) $scope.formalarm.alarmtype = alarm.alarmSolarEvent;
							if (alarm.hasOwnProperty("alarmSolarOffset")) $scope.formalarm.alarmOffset = alarm.alarmSolarOffset;
							$scope.updateSolarLabels();
							const time = new Date(alarm.alarmtime);
							$scope.getElement("alarmTime").value = $scope.formatTime(time.getHours(), time.getMinutes());
							for (let i = 0; i < alarm.days.length; i++) {
								if (alarm.days[$scope.localDayToUtc(alarm, i)]) $scope.formalarm.dayselect.push(i);
							}
							$scope.formalarm.disabled = alarm.hasOwnProperty("disabled");
						}
					}

					$scope.addAlarm = function() {
						const now = new Date();
						const alarmInput = $scope.getElement("alarmTime").value.split(":");
						const alarmtime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), alarmInput[0], alarmInput[1], 0, 0).getTime();

						const alarm = {
							alarmtime: alarmtime,
							days: [0, 0, 0, 0, 0, 0, 0],
							output: $scope.myAlarmSelect
						};

						if ($scope.formalarm.alarmtype !== "custom") {
							alarm.alarmSolarEvent = $scope.formalarm.alarmtype;
							alarm.alarmSolarOffset = $scope.formalarm.alarmOffset;
						}

						$scope.formalarm.dayselect.forEach(day => {
							const utcDay = $scope.localDayToUtc(alarm, Number(day));
							alarm.days[utcDay] = 1;
						});

						if ($scope.formalarm.disabled) alarm.disabled = "disabled";

						const alarmIndex = $scope.formalarm.index;
						if (alarmIndex === undefined) {
							$scope.alarms.push(alarm);
						} else {
							$scope.alarms.splice(alarmIndex, 1, alarm);
						}

						$scope.sendAlarmsToOutput();
					}

					$scope.deleteAlarm = function() {
						$scope.alarms.splice($scope.formalarm.index, 1);
						$scope.sendAlarmsToOutput();
					}

					$scope.sendAlarmsToOutput = function() {
						if (!$scope.msg) $scope.msg = [{ payload: "" }];
						$scope.msg[0].payload = {
							alarms: angular.copy($scope.alarms),
							settings: {
								disabledAlarms: angular.copy($scope.disabledAlarms),
								overviewFilter: angular.copy($scope.overviewFilter)
							}
						};
						$scope.send([$scope.msg[0]]);
					}

					$scope.daysChanged = function() {
						if ($scope.formalarm.dayselect.length === 8) {
							$scope.formalarm.dayselect = [];
						} else if ($scope.formalarm.dayselect.includes('all')) {
							$scope.formalarm.dayselect = [0, 1, 2, 3, 4, 5, 6];
						};
					}

					$scope.minutesToReadable = function(minutes) {
						return (Math.floor(minutes / 60) > 0 ? Math.floor(minutes / 60) + "h " : "") + (minutes % 60 > 0 ? minutes % 60 + "m" : "");
					}

					$scope.millisToTime = function(millis) {
						const date = new Date(millis);
						return $scope.formatTime(date.getHours(), date.getMinutes());
					}

					$scope.formatTime = function(hours, minutes) {
						return $scope.padZero(hours) + ":" + $scope.padZero(minutes);
					}

					$scope.updateSolarLabels = function() {
						const alarmOffset = $scope.formalarm.alarmOffset > 0 ? "+" + $scope.formalarm.alarmOffset : ($scope.formalarm.alarmOffset || 0);
						const alarmTypeLabel = alarmOffset === 0 ? $scope.i18n[$scope.formalarm.alarmtype] : $scope.i18n[$scope.formalarm.alarmtype].substr(0, 8);
						$scope.formalarm.solarAlarmTimeLabel = alarmTypeLabel + (alarmOffset != 0 ? " " + alarmOffset + "m" : "");
					}

					$scope.offsetValidation = function() {
						if ($scope.formalarm.alarmOffset > 300) $scope.formalarm.alarmOffset = 300;
						if ($scope.formalarm.alarmOffset < -300) $scope.formalarm.alarmOffset = -300;
						$scope.updateSolarLabels();
					}

					$scope.localDayToUtc = function(alarm, localDay) {
						const time = new Date(alarm.alarmtime);
						let shift = time.getUTCDay() - time.getDay();
						if (shift < -1) shift = 1;
						if (shift > 1) shift = -1;
						let utcDay = shift + localDay;
						if (utcDay < 0) utcDay = 6;
						if (utcDay > 6) utcDay = 0;
						return utcDay;
					}

					$scope.padZero = function(i) {
						return i < 10 ? "0" + i : i;
					}

					$scope.getElement = function(elementId) {
						return document.querySelector("#" + elementId + "-" + $scope.nodeId.replace(".", ""));
					}

					$scope.changeFilter = function(filter) {
						$scope.overviewFilter = filter;
						$scope.sendAlarmsToOutput();
					}

					$scope.getAlarmsByOverviewFilter = function() {
						if ($scope.overviewFilter === 'all') return $scope.alarms;
						return $scope.alarms ? $scope.alarms.filter(alarm => !alarm.disabled && $scope.isAlarmEnabled(alarm.output)) : [];
					}

					$scope.toggleAlarmStatus = function(alarmIndex) {
						if ($scope.isAlarmEnabled(alarmIndex)) {
							$scope.disabledAlarms = $scope.disabledAlarms || [];
							$scope.disabledAlarms.push(alarmIndex);
						} else {
							$scope.disabledAlarms.splice($scope.disabledAlarms.indexOf(alarmIndex), 1);
						}
						$scope.sendAlarmsToOutput();
					}

					$scope.isAlarmEnabled = function(alarmIndex) {
						const disabledAlarms = $scope.disabledAlarms || [];
						return !disabledAlarms.includes(alarmIndex.toString());
					}

					$scope.getAlarmsFromServer = function() {
						$.ajax({
							url: "alarm-clock/getNode/" + $scope.nodeId, dataType: 'json',
							beforeSend: function() {
								$scope.loading = true;
							},
							success: function(json) {
								$scope.alarms = json.alarms;
								$scope.disabledAlarms = json.settings.disabledAlarms;
								$scope.overviewFilter = json.settings.overviewFilter;
								$scope.$digest();
							},
							complete: function() {
								$scope.loading = false;
								$scope.showStandardView();
								$scope.$digest();
							}
						});
					}
				}
			});

			let nodeInterval;
			let prevMsg = [];

			(() => {
				let alarms = getContextValue('alarms');
				if (validateAlarms(alarms)) {
					node.status({});
					alarms = alarms.filter(alarm => alarm.output < config.alarm_names.length);
				} else {
					node.status({ fill: "green", shape: "dot", text: "alarm-clock.contextCreated" });
					alarms = [];
				}
				setAlarms(alarms);
				createInitTimeout();
			})();

			function validateAlarms(alarms) {
				return Array.isArray(alarms) && alarms.every(alarm => {
					if ((!alarm.hasOwnProperty("alarmtime") || !alarm.hasOwnProperty("days")) || alarm.hasOwnProperty("event")) return false;

					if (!alarm.hasOwnProperty("output")) alarm.output = "0";
					else if (Number.isInteger(alarm.output)) alarm.output = alarm.output.toString();

					return true;
				});
			}

			function getContextValue(key) {
				return config.customContextStore && RED.settings.contextStorage && RED.settings.contextStorage.hasOwnProperty(config.customContextStore) ?
					node.context().get(key, config.customContextStore) : node.context().get(key);
			}

			function setContextValue(key, value) {
				config.customContextStore && RED.settings.contextStorage && RED.settings.contextStorage.hasOwnProperty(config.customContextStore) ?
					node.context().set(key, value, config.customContextStore) : node.context().set(key, value);
			}

			function getAlarms() {
				const alarms = getContextValue('alarms') || [];
				return updateSolarEvents(alarms).sort(function(a, b) {
					const millisA = getNowWithCustomTime(a.alarmtime);
					const millisB = getNowWithCustomTime(b.alarmtime);
					return millisA - millisB;
				});
			}

			function setAlarms(alarms) {
				setContextValue('alarms', alarms);
			}

			function getSettings() {
				return getContextValue('settings') || {};
			}

			function setSettings(settings) {
				setContextValue('settings', settings);
			}

			function getDisabledAlarms() {
				return getSettings().disabledAlarms || [];
			}

			function setDisabledAlarms(disabledAlarms) {
				setSettings({ ...getSettings(), disabledAlarms });
			}

			function addDisabledAlarm(alarm) {
				const disabledAlarms = getDisabledAlarms();
				const alarmIndex = (isNaN(alarm) ? config.alarm_names.indexOf(alarm) : alarm).toString();
				if (alarmIndex >= 0 && config.alarm_names.length > alarmIndex && !disabledAlarms.includes(alarmIndex)) {
					disabledAlarms.push(alarmIndex);
					setDisabledAlarms(disabledAlarms);
					return true;
				}
				return false;
			}

			function removeDisabledAlarm(alarm) {
				const disabledAlarms = getDisabledAlarms();
				const alarmIndex = (isNaN(alarm) ? config.alarm_names.indexOf(alarm) : alarm).toString();
				if (alarmIndex >= 0 && config.alarm_names.length > alarmIndex && disabledAlarms.includes(alarmIndex)) {
					disabledAlarms.splice(disabledAlarms.indexOf(alarmIndex), 1);
					setDisabledAlarms(disabledAlarms);
					return true;
				}
				return false;
			}

			function createInitTimeout() {
				const today = new Date();
				const remaining = config.refresh - (today.getSeconds() % config.refresh);
				setTimeout(function() {
					nodeInterval = setInterval(onInterval, config.refresh * 1000);
					onInterval();
				}, (remaining * 1000) - today.getMilliseconds());
			}

			function onInterval() {
				const outputValues = [null];
				addOutputValues(outputValues);
				node.send(outputValues);
			}

			function addOutputValues(outputValues) {
				for (let alarm = 0; alarm < config.alarm_names.length; alarm++) {
					const msg = { payload: isInTime(alarm) };
					msg.topic = config.alarm_names[alarm];
					msg.payload ? outputValues.push(msg) : outputValues.push(null);
				}
				removeUnchangedValues(outputValues);
			}

			function removeUnchangedValues(outputValues) {
				const currMsg = JSON.parse(JSON.stringify(outputValues));
				for (let i = 1; i <= config.alarm_names.length; i++) {
					if (prevMsg[i] && currMsg[i] && (prevMsg[i].payload === currMsg[i].payload)) {
						outputValues[i] = null;
					}
				}
				prevMsg = currMsg;
			}

			function isInTime(alarmIndex) {
				const nodeAlarms = getAlarms();
				let status = false;
				let stringIndex = alarmIndex.toString();
				if (nodeAlarms.length > 0 && !getDisabledAlarms().includes(stringIndex)) {
					const date = new Date();

					nodeAlarms.filter(alarm => alarm.output === stringIndex).forEach(function(alarm) {
						if (status !== status) return;
						if (alarm.hasOwnProperty("disabled")) return;

						const utcDay = localDayToUtc(alarm, date.getDay());
						if (alarm.days[utcDay] === 0) return;

						const localAlarmTime = new Date(alarm.alarmtime);
						const compareDate = new Date(localAlarmTime);
						compareDate.setHours(date.getHours());
						compareDate.setMinutes(date.getMinutes());

						if (compareDate.getTime() === localAlarmTime.getTime()) {
							status = true;
						}
					});
				}

				return status;
			}

			function getNextAlarmTime(alarmIndex) {
				let stringIndex = alarmIndex.toString();

				if (getDisabledAlarms().includes(stringIndex)) {
					return null;
				}

				const alarms = JSON.parse(
					JSON.stringify(
						(getContextValue('alarms') || [])
										.filter(alarm => alarm.output === stringIndex)
										.filter(alarm => !alarm.disabled)
					)
				);

				if (alarms.length === 0) {
					return null;
				}

				let nextAlarm = null;

				const nowTime = new Date().getTime();

				for (let offset = 0; offset < 8; offset++) {
					if (nextAlarm) break;
					const currentDate = new Date(nowTime + (offset * 24 * 60 * 60 * 1000));
					const currentAlarms = updateSolarEvents(alarms, currentDate);
					currentAlarms.forEach((alarm) => {
						const utcDay = localDayToUtc(alarm, currentDate.getDay());
						if (alarm.days[utcDay] === 0) return;

						const localAlarmTime = new Date(alarm.alarmtime);

						const compareDate = new Date(currentDate);
						compareDate.setHours(localAlarmTime.getHours());
						compareDate.setMinutes(localAlarmTime.getMinutes());
						const compareTime = compareDate.getTime();
						if (compareTime > nowTime && (!nextAlarm || compareTime < nextAlarm)) nextAlarm = compareTime;
					});
				}
				return nextAlarm;
			}

			function localDayToUtc(alarm, localDay) {
				const time = new Date(alarm.alarmtime);
				let shift = time.getUTCDay() - time.getDay();
				if (shift < -1) shift = 1;
				if (shift > 1) shift = -1;
				let utcDay = shift + localDay;
				if (utcDay < 0) utcDay = 6;
				if (utcDay > 6) utcDay = 0;
				return utcDay;
			}

			function getNowWithCustomTime(timeInMillis) {
				const date = new Date();
				const origDate = new Date(timeInMillis);
				date.setHours(origDate.getHours());
				date.setMinutes(origDate.getMinutes());
				date.setSeconds(0); date.setMilliseconds(0);
				return date.getTime();
			}

			function updateSolarEvents(alarms, fromDate) {
				if (config.solarEventsEnabled) {
					const sunTimes = sunCalc.getTimes(fromDate || new Date(), config.lat, config.lon);
					return alarms.map(alarm => {
						if (alarm.hasOwnProperty("alarmSolarEvent")) {
							const offset = alarm.alarmSolarOffset || 0;
							const solarTime = sunTimes[alarm.alarmSolarEvent];
							alarm.alarmtime = solarTime.getTime() + (offset * 60 * 1000);
						}
						return alarm;
					});
				} else {
					return alarms.filter(alarm => !alarm.hasOwnProperty("alarmSolarEvent"));
				}
			}

			function getUpcomingAlarms() {
				const upcoming = {};
				for (let alarm = 0; alarm < config.alarm_names.length; alarm++) {
					const next = getNextAlarmTime(alarm);
					if (next) {
						upcoming[config.alarm_names[alarm]] = next;
					}
				}
				return upcoming;
			}

			function getNodeData() {
				return { alarms: getAlarms(), settings: getSettings(), upcoming: getUpcomingAlarms() };
			}

			node.nodeCallback = function nodeCallback(req, res) {
				res.send(getNodeData());
			}

			node.on("close", function() {
				if (nodeInterval) {
					clearInterval(nodeInterval);
				}
				if (done) {
					done();
				}
			});
		} catch (error) {
			console.log("AlarmClockNode:", error);
		}
	}
	RED.nodes.registerType("ui_alarm_clock", AlarmClockNode);

	let uiPath = ((RED.settings.ui || {}).path);
	if (uiPath === undefined) uiPath = 'ui';
	let nodePath = '/' + uiPath + '/alarm-clock/getNode/:nodeId';
	nodePath = nodePath.replace(/\/+/g, '/');

	RED.httpNode.get(nodePath, function(req, res) {
		const nodeId = req.params.nodeId;
		const node = RED.nodes.getNode(nodeId);
		node ? node.nodeCallback(req, res) : res.send(404).end();
	});
}
