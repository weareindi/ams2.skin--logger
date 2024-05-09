const { parentPort } = require('node:worker_threads');
const { setTimeout: sleep } = require('node:timers/promises');
const path = require('node:path');
const { execFile } = require('child_process');
require('dotenv').config();

class WorkerCrest {
    constructor() {
        this.ip = '127.0.0.1';
        this.port = 8990;
        this.previousSessionState = null;

        this.init();
    }

    /**
     * Let's go!
     */
    async init() {
        try {
            await this.registerParentListener();
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * Register Worker listeners
     */
    async registerParentListener() {
        return parentPort.on('message', async (data) => {
            if (typeof data === 'undefined') {
                return console.error('No message supplied');
            }

            if (data.name === 'load') {
                await this.updateSettings();
                const x = await this.openCrest();
                await this.returnMessage('loadcomplete');
            }

            if (data.name === 'fetch') {
                await this.startFetching();
                await this.returnMessage('fetchcomplete');
            }
        });
    }

    /**
     * 
     */
    async updateSettings() {
        if (typeof process.env.CREST2_IP !== 'undefined') {
            this.ip = process.env.CREST2_IP;
        }

        if (typeof process.env.CREST2_PORT !== 'undefined') {
            this.port = process.env.CREST2_PORT;
        }
    }

    /**
     * Open Crest
     */
    async openCrest() {
        return execFile('./resources/CREST2-AMS2/CREST2.exe', ['-p', this.port], (error) => {
            console.log(error);
        }); 
    }

    /**
     * Close Crest
     */
    async closeCrest() {
        if (typeof this.crest2 === 'undefined') {
            return null;
        }

        return this.crest.kill();
    }

    /**
     * 
     */
    async startFetching() {
        await this.fetch();
    }

    /**
     * Fetch crest data
     */
    async fetch() {
        const data = await this.fetchData();

        const isConnected = await this.isConnected(data);
        await this.returnMessage('isConnected', isConnected);
        if (isConnected) {
            const isNewSession = await this.isNewSession(data);
            if (isNewSession) {
                await this.returnMessage('new');
            }

            const isReady = await this.isReady(data);
            if (!isReady) {
                await this.returnMessage('idle', true);
            }
            if (isReady) {
                await this.returnMessage('idle', false);
                const processed = await this.processData(data);
                await this.returnMessage('data', processed);
            }
        }

        await sleep(1000);
        await this.fetch();
    }

    /**
     * 
     */
    async isConnected(data) {
        if (typeof data === 'undefined') {
            return false;
        }

        if (data === null) {
            return false;
        }

        if (!data) {
            return false;
        }

        return true;
    }

    /**
     * Is the game in a state ready for either hud?
     * @param {*} data 
     * @returns boolean
     */
    async isReady(data) {
        // replay
        if (data.gameStates.mGameState === 7 && data.gameStates.mSessionState === 5 && data.gameStates.mRaceState === 2) {
            return true;
        }

        // not in a proper session
        if (data.gameStates.mGameState === 1 && !data.gameStates.mSessionState && !data.gameStates.mRaceState) {
            return false;
        }

        return true;
    }

    /**
     * Has the session restarted or changed?
     * @param {*} data 
     * @returns boolean
     */
    async isNewSession(data) {
        if (!('gameStates' in data)) {
            return false;
        }

        if (!('mSessionState' in data.gameStates)) {
            return false;
        }

        if (this.previousSessionState === data.gameStates.mSessionState) {
            return false;
        }

        this.previousSessionState = data.gameStates.mSessionState;

        return true;
    }

    /**
     * 
     * @param {*} data 
     */
    async processData(data) {
        if (data === null) {
            return null;
        }

        const timestamp = await this.getPrecisionTimestamp();

        const participant = await this.getCurrentParticipant(data);
        const participantName = await this.getParticipantName(participant);
        const participantRacePosition = await this.getParticipantRacePosition(participant);
        const participantCurrentLap = await this.getParticipantCurrentLap(participant);
        const participantLapDistance = await this.getParticipantLapDistance(participant);

        const translatedTrackVariation = await this.getTranslatedTrackVariation(data);
        const carClassName = await this.getCarClassName(data);
        const timeElapsed = await this.getTimeElapsed(data);
        const timeRemaining = await this.getTimeRemaining(data);
        const gameState = await this.getGameState(data);
        const sessionState = await this.getSessionState(data);
        const raceState = await this.getRaceState(data);
        const ambientTemperature = await this.getAmbientTemperature(data);
        const trackTemperature = await this.getTrackTemperature(data);
        const rainDensity = await this.getRainDensity(data);

        return {
            participantName,
            participantRacePosition,
            participantCurrentLap,
            participantLapDistance,
            translatedTrackVariation,
            carClassName,
            timestamp,
            timeElapsed,
            timeRemaining,
            gameState,
            sessionState,
            raceState,
            ambientTemperature,
            trackTemperature,
            rainDensity
        };
    }


    /**
     * 
     * @param {*} data 
     */
    async getTranslatedTrackVariation(data) {
        if (!('eventInformation' in data)) {
            return null;
        }

        if (!('mTranslatedTrackVariation' in data.eventInformation)) {
            return null;
        }

        return data.eventInformation.mTranslatedTrackVariation;
    }

    /**
     * 
     * @param {*} data 
     */
    async getCarClassName(data) {
        if (!('vehicleInformation' in data)) {
            return null;
        }

        if (!('mCarName' in data.vehicleInformation)) {
            return null;
        }

        return data.vehicleInformation.mCarName;
    }



    /**
     * 
     * @param {*} data 
     */
    async getCurrentParticipant(data) {
        if (!('participants' in data)) {
            return null;
        }

        if (!('mViewedParticipantIndex' in data.participants)) {
            return null;
        }

        if (!('mParticipantInfo' in data.participants)) {
            return null;
        }

        return data.participants.mParticipantInfo[data.participants.mViewedParticipantIndex];
    }

    /**
     * 
     * @param {*} participant 
     */
    async getParticipantName(participant) {
        if (!('mName' in participant)) {
            return null;
        }

        return participant.mName;
    }

    /**
     * 
     * @param {*} participant 
     */
    async getParticipantRacePosition(participant) {
        if (!('mRacePosition' in participant)) {
            return null;
        }

        return participant.mRacePosition;
    }

    /**
     * 
     * @param {*} participant 
     */
    async getParticipantCurrentLap(participant) {
        if (!('mCurrentLap' in participant)) {
            return null;
        }

        return participant.mCurrentLap;
    }

    /**
     * 
     * @param {*} participant 
     */
    async getParticipantLapDistance(participant) {
        if (!('mCurrentLapDistance' in participant)) {
            return null;
        }

        return participant.mCurrentLapDistance;
    }

    /**
     * 
     * @param {*} data 
     */
    async getPrecisionTimestamp() {
        return performance.timeOrigin + performance.now();
    }

    /**
     * 
     * @param {*} data 
     */
    async getTimeElapsed(data) {
        if (!('timings' in data)) {
            return null;
        }

        if (!('mEventTimeRemaining' in data.timings)) {
            return null;
        }

        if (!('eventInformation' in data)) {
            return null;
        }

        if (!('mSessionDuration' in data.eventInformation)) {
            return null;
        }

        return data.eventInformation.mSessionDuration - data.timings.mEventTimeRemaining;
    }

    /**
     * 
     * @param {*} data 
     */
    async getTimeRemaining(data) {
        if (!('timings' in data)) {
            return null;
        }

        if (!('mEventTimeRemaining' in data.timings)) {
            return null;
        }

        return data.timings.mEventTimeRemaining;
    }

    /**
     * 
     * @param {*} data 
     */
    async getGameState(data) {
        if (!('gameStates' in data)) {
            return null;
        }

        if (!('mGameState' in data.gameStates)) {
            return null;
        }

        return data.gameStates.mGameState;
    }

    /**
     * 
     * @param {*} data 
     */
    async getSessionState(data) {
        if (!('gameStates' in data)) {
            return null;
        }

        if (!('mSessionState' in data.gameStates)) {
            return null;
        }

        return data.gameStates.mSessionState;
    }

    /**
     * 
     * @param {*} data 
     */
    async getRaceState(data) {
        if (!('gameStates' in data)) {
            return null;
        }

        if (!('mRaceState' in data.gameStates)) {
            return null;
        }

        return data.gameStates.mRaceState;
    }

    /**
     * 
     * @param {*} data 
     */
    async getAmbientTemperature(data) {
        if (!('weather' in data)) {
            return null;
        }

        if (!('mAmbientTemperature' in data.weather)) {
            return null;
        }

        return data.weather.mAmbientTemperature;
    }

    /**
     * 
     * @param {*} data 
     */
    async getTrackTemperature(data) {
        if (!('weather' in data)) {
            return null;
        }

        if (!('mTrackTemperature' in data.weather)) {
            return null;
        }

        return data.weather.mTrackTemperature;
    }

    /**
     * 
     * @param {*} data 
     */
    async getRainDensity(data) {
        if (!('weather' in data)) {
            return null;
        }

        if (!('mRainDensity' in data.weather)) {
            return null;
        }

        return data.weather.mRainDensity;
    }

    /**
     * Fetch data from crest
     */
    async fetchData() {
        // init fetch request
        const url = `http://${this.ip}:${this.port}/crest2/v1/api`;

        // fetch the data
        const response = await fetch(url,
            {
                signal: AbortSignal.timeout(1000),
                // headers: {
                //     'Accept-Encoding': 'gzip'
                // }
            }).catch(async (error) => {
                return null;
            });
        
        // no response?
        if (!response) {
            // .. bail and return a message to parent
            return null;
        }

        // validate response
        const valid = await this.validate(response);
        if (!valid) {
            // .. bail and return a message to parent
            return null;
        }

        // if we got here we should have good data
        return await response.json();
    }

    /**
     * Do we have valid data?
     * @param {*} fetchResponse 
     * @returns boolean
     */
    async validate(fetchResponse) {
        // clone the response to main so our events in this method don't contaminate main thread
        const response = fetchResponse.clone();

        if (response.status !== 200) {
            return false;
        }

        // get text from response
        let textResponse = await response.text();

        // prep for json
        let passedJson;

        // is it json?
        try {
            passedJson = JSON.parse(textResponse);
        } catch (e) {
            return false;
        }

        // do we have a timestamp in the response? probably valid then
        if (!('timestamp' in passedJson)) {
            return false;
        }
        
        return true;
    }

    /**
     * Easy method to send a message back to parent worker with/without additional data
     * @param {*} name 
     * @param {*} data 
     */
    async returnMessage(name, data = null) {
        // if (!data) {
        //     return parentPort.postMessage({
        //         name
        //     });
        // }


        return parentPort.postMessage({
            name,
            data
        });
    }
}

new WorkerCrest();
