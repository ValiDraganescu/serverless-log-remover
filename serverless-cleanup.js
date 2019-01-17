"use strict";
const path = require("path");
const fs = require("fs");

class ServerlessCleanup {

    constructor(serverless, options) {
        this._serverless = serverless;
        this._serverless.cli.log(`Executing cleanup`);
        this._options = options;
        this.commands = {
            cleanup: {
                usage: "Cleans up the code that has been defined as a pattern in the custom section of your serverless.yml file",
                lifecycleEvents: [
                    "cleanup"
                ],
                options: {
                    message: {}
                }
            }

        };
        this.hooks = {
            "before:run:run": async () => {
                await this.cleanup();
            },
            "before:offline:start": async () => {
                await this.cleanup();
            },
            "before:offline:start:init": async () => {
                await this.cleanup();
            },
            "before:package:cleanup": async () => {
                await this.cleanup();
            },
            "cleanup:cleanup": this.cleanup.bind(this),
        };
    }

    walkSync(dir, fileList = []) {
        let self = this;
        fs.readdirSync(dir).forEach(file => {
            const dirFile = path.join(dir, file);
            try {
                fileList = self.walkSync(dirFile, fileList);
            }
            catch (err) {
                if (err.code === "ENOTDIR" || err.code === "EBUSY") fileList = [...fileList, dirFile];
                else throw err;
            }
        });
        return fileList;
    }

    isRemoveStage(job) {
        return job.stages.indexOf(this._serverless.service.custom.cleanup.currentStage) > -1;
    }

    execute(job) {
        const isRemovableStage = this.isRemoveStage(job);
        if (!isRemovableStage) {
            this._serverless.cli.log(`Not a cleanup stage, skip`);
            return;
        }
        const files = this.walkSync(job.dir, []);
        if (!files || files.length === 0) {
            this._serverless.cli.log(`Nothing to cleanup, skip`);
            return
        }
        this._serverless.cli.log(`Need to update ${files.length} files`);
        for (let file of files) {
            this._serverless.cli.log(`Working on file: ${file}`);
            if (file.length > 0) {
                let code = String(fs.readFileSync(file));
                if (job.patterns) {
                    for (let pattern of job.patterns) {
                        // this._serverless.cli.log("Removing based on pattern");
                        const regex = new RegExp(pattern, "gmi");
                        // this._serverless.cli.log(`Replace regex:: ${regex}`);
                        code = code.replace(regex, "");
                    }
                }
                if (job.logs) {
                    for (let log of job.logs) {
                        // this._serverless.cli.log("Removing logs");
                        const regex = new RegExp(`this._serverless.cli.${log}\(.*\);?`, "gmi");
                        // this._serverless.cli.log(`Replace regex:: ${regex}`);
                        code = code.replace(regex, "");
                    }
                }

                if (job.comments) {
                    // remove single line comments
                    // this._serverless.cli.log("Removing single line comments");
                    const regex = new RegExp("^\\/\\/.+", "gmi");
                    code = code.replace(regex, "");
                }
                if(job.tidyup) {
                    code = code.replace(" ", "");
                    code = code.replace("/(?:\\r\\n|\\r|\\n)/", "");
                }
                fs.writeFileSync(file, code);
            }
        }

    }

    cleanup() {
        if (!this._serverless.service.custom.cleanup
            || !this._serverless.service.custom.cleanup.jobs) {
            this._serverless.cli.log("No jobs, defined, skipping");
            return;
        }
        const jobs = this._serverless.service.custom.cleanup.jobs;
        this._serverless.cli.log("Executing " + jobs.length + " cleanup jobs");
        for (let job of jobs) {
            this.execute(job);
        }

    }
}

module.exports = ServerlessCleanup;
