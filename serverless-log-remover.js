"use strict";
const path = require("path");
const fs = require("fs");

class LogRemover {

    constructor(serverless, options) {
        this._serverless = serverless;
        this._options = options;
        this.commands = {
            removeCode: {
                usage: "Removes the code that has been defined as a pattern in the custom section of your serverless.yml file",
                lifecycleEvents: [
                    "remove"
                ],
                options: {
                    message: {}
                }
            }

        };
        this.hooks = {
            "before:run:run": async () => {
                await this.remove();
            },
            "before:offline:start": async () => {
                await this.remove();
            },
            "before:offline:start:init": async () => {
                await this.remove();
            },
            "before:package": async () => {
                await this.remove();
            },
            "removeCode:remove": this.remove.bind(this),
        };
    }

    walkSync(dir, fileList = []) {
        let self = this;
        fs.readdirSync(dir).forEach(file => {
            const dirFile = path.join(dir, file);
            if (dirFile.indexOf("node_modules") === -1) {
                try {
                    fileList = self.walkSync(dirFile, fileList);
                }
                catch (err) {
                    if (err.code === "ENOTDIR" || err.code === "EBUSY") fileList = [...fileList, dirFile];
                    else throw err;
                }
            }
        });
        return fileList;
    }

    isRemoveStage(job) {
        return job.stages.indexOf(this._serverless.service.custom.logRemover.currentStage) > -1;
    }

    execute(job) {
        const comments = job.comments;
        const removeSingleLine = comments && comments.includes("single-line");
        const removeMultiLine = comments && comments.includes("multi-line");
        if (this.isRemoveStage()) {
            const files = this.walkSync(job.dir, []);
            if (!files || files.length === 0) {
                return
            }
            this._serverless.cli.log(`Need to update ${files.length} files`);
            for (let file of files) {
                if (file.length > 0) {
                    let code = String(fs.readFileSync(file));
                    for (let pattern of job.patterns) {
                        const regex = new RegExp(pattern, "gmi");
                        // this._serverless.cli.log(`Replace regex:: ${regex}`);
                        code = code.replace(regex, "");
                    }
                    for (let log of job.logs) {
                        const regex = new RegExp(`console.${log}\(.*\);?`, "gmi");
                        // this._serverless.cli.log(`Replace regex:: ${regex}`);
                        code = code.replace(regex, "");
                    }
                    if (removeSingleLine) {
                        // remove single line comments
                        const regex = new RegExp("\\/\\/.+", "gmi");
                        code = code.replace(regex, "");
                    }
                    if (removeMultiLine) {
                        // remove multi line comments
                        const regex = new RegExp("\\/\\*[\\s\\S]*?\\*\\/|([^\\\\:]|^)\\/\\/.*$", "gmi");
                        code = code.replace(regex, "");
                    }
                    fs.writeFileSync(file, code);
                }
            }
        }
    }

    remove() {
        this._serverless.cli.log("Executing log remover jobs");
        if (!this._serverless.service.custom.logRemover
            || !this._serverless.service.custom.logRemover.jobs) {
            return;
        }
        const jobs = this._serverless.service.custom.logRemover.jobs;

        for (let job of jobs) {
            this.execute(job);
        }

    }
}

module.exports = LogRemover;