const { Worker } = require('node:worker_threads');
const fs = require('node:fs');
const { spinner, intro, outro } = require('@clack/prompts');
const color = require('picocolors');
const path = require('node:path');

/**
 * MainThread
 */
module.exports = class MainThread {
    constructor() {
        this.workerCrest = new Worker( path.join(__dirname, 'workerCrest.js') );
        this.logPathName = './logs';
        this.logFileName = null;
        this.spinner = spinner();
        this.spinnerActive = false;
        this.spinnerMsg = '';
        this.isConnected = null;
        this.isIdle = null;
        this.isNew = false;
        this.fresh = true;

        this.init();
    }

    async init() {
        try {
            await this.registerProcessEvents();
            await this.intro();
            await this.registerListeners();
            await this.start();
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * 
     */
    async startSpinner(msg = '') {
        // return null;
        if (this.spinnerActive) {
            await this.stopSpinner();
        }

        this.spinner.start(msg);
        this.spinnerMsg = msg;
        this.spinnerActive = true;
    }

    /**
     * 
     */
    async stopSpinner(msg = null) {
        // return null;
        if (!this.spinnerActive) {
            return null;
        }

        this.spinner.stop(msg !== null ? msg : '');
        this.spinnerMsg = '';
        this.spinnerActive = false;
    }

    /**
     * 
     */
    async registerProcessEvents() {
        process.on('exit', async () => {
            await this.stop();
        });

        process.on('SIGINT', async () => {
            await this.stop();
        });

        process.on('SIGUSR1', async () => {
            // await this.stop();
        });

        process.on('SIGUSR2', async () => {
            // await this.stop();
        });

        process.on('uncaughtException', async () => {
            // await this.stop();
        });
    }

    /**
     * App Intro
     */
    async intro() {
        intro(color.inverse('AMS2.skin: Logger'));
    }

    /**connected
     * Start
     */
    async start() {
        await this.startSpinner('Loading');
        await this.postMessage(this.workerCrest, 'load');
    }

    /**
     * Stop
     */
    async stop() {
        await this.closeLog();
        process.exit(0);
    }

    /**
     * Register worker listeners
     */
    async registerListeners() {
        await this.registerWorkerCrestListener();
    }

    /**
     * Register worker crest listener
     */
    async registerWorkerCrestListener() {
        this.workerCrest.on('message', async (data) => {
            if (typeof data === 'undefined') {
                return console.error('No message supplied');
            }

            if (data.name === 'loadcomplete') {
                await this.stopSpinner('Load Complete!');

                await this.postMessage(this.workerCrest, 'fetch');
            }

            if (data.name === 'fetchcomplete') {
                console.log('fetchcomplete');
            }

            if (data.name === 'isConnected') {
                await this.processConnection(data.data);
            }

            if (data.name === 'idle') {
                await this.processIdle(data.data);
            }
            
            if (data.name === 'new') {
                this.isNew = true;
                this.fresh = true;
                await this.closeLog();
            }

            if (data.name === 'data') {
                if (this.isNew) {
                    await this.createLogFileName();
                    await this.createLogsDir();
                    await this.openLog();
                    this.isNew = false;
                    this.fresh = true;
                }

                const processed = await this.processData(data.data);
                await this.processLog(processed);
                this.fresh = false;
            }
        });
    }

    /**
     * 
     * @param {*} data 
     */
    async processConnection(data) {
        if (data === false && this.isConnected !== false) {
            await this.startSpinner('Connecting');
        }

        if (!data) {
           return this.isConnected = false;
        }

        if (data === true && this.isConnected !== true) {
            await this.stopSpinner('Connected');
        }

        return this.isConnected = true;
    }

    /**
     * 
     * @param {*} data 
     */
    async processIdle(data) {
        if (data === true && this.isIdle !== true) {
            await this.startSpinner('Waiting for data');
        }

        if (data) {
           return this.isIdle = true;
        }

        if (data === false && this.isIdle !== false) {
            await this.stopSpinner('Data incoming!');
        }

        return this.isIdle = false;
    }

    /**
     * 
     */
    async createLogFileName() {
        const currentTime = (performance.timeOrigin + performance.now()).toFixed(0);
        this.logFileName = `${currentTime}.json`;
    }

    /**
     * 
     */
    async createLogsDir() {
        return await fs.promises.mkdir(this.logPathName, { recursive: true });
    }

    /**
     * 
     */
    async closeLog() {
        if (this.logPathName === null) {
            return null;
        }

        if (this.logFileName === null) {
            return null;
        }

        await this.stopSpinner(`Logging Complete: "${this.logPathName}/${this.logFileName}"`);
        
        return await fs.promises.appendFile(`${this.logPathName}/${this.logFileName}`, ']');
    }

    /**
     * 
     */
    async openLog() {
        if (this.logPathName === null) {
            return null;
        }

        if (this.logFileName === null) {
            return null;
        }

        if (fs.existsSync(`${this.logPathName}/${this.logFileName}`)) {
            return null;
        }

        await this.startSpinner('Logging');
        
        return await fs.promises.appendFile(`${this.logPathName}/${this.logFileName}`, '[');
    }

    /**
     * 
     * @param {*} string 
     */
    async appendToLog(string) {
        let log = '';

        if (this.fresh === false) {
            log += ',';
        }

        log += string;

        return await fs.promises.appendFile(`${this.logPathName}/${this.logFileName}`, log);
    }

    /**
     * Process data from crest
     */
    async processData(data) {
        // no data returned?
        if (typeof data === 'undefined') {
            // ... return false
            return false;
        }

        return data;
    }

    /**
     * 
     * @param {*} data 
     */
    async processLog(data) {
        const json = JSON.stringify(data);
        await this.appendToLog(json);
    }

    /**
     * Easy method to send a message to a child worker with/without additional data
     * @param {*} data 
     */
    async postMessage(worker, name, data = null) {
        if (!data) {
            return worker.postMessage({
                name
            });
        }

        return worker.postMessage({
            name,
            data
        });
    }
}
