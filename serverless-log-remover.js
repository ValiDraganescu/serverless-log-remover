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

    isRemoveStage() {
        return this._serverless.service.custom.logRemover.stages.indexOf(this._serverless.service.custom.logRemover.currentStage) > -1;
    }

    remove() {
        this._serverless.cli.log("Removing code");
        if (!this._serverless.service.custom.logRemover
            || !this._serverless.service.custom.logRemover.dir
            || !this._serverless.service.custom.logRemover.patterns) {
            return;
        }
        const comments = this._serverless.service.custom.logRemover.comments;
        const removeSingleLine = comments && comments.includes("single-line");
        const removeMultiLine = comments && comments.includes("multi-line");
        if (this.isRemoveStage()) {
            const files = this.walkSync(this._serverless.service.custom.logRemover.dir, []);
            if (!files || files.length === 0) {
                return
            }
            this._serverless.cli.log(`Need to update ${files.length} files`);
            for (let file of files) {
                if (file.length > 0) {
                    let code = String(fs.readFileSync(file));
                    for (let pattern of this._serverless.service.custom.logRemover.patterns) {
                        const regex = new RegExp(pattern,"gmi");
                        // this._serverless.cli.log(`Replace regex:: ${regex}`);
                        code = code.replace(regex, "");
                    }
                    for (let log of this._serverless.service.custom.logRemover.logs) {
                        const regex = new RegExp(`console.${log}\(.*\);?`,"gmi");
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
}

module.exports = LogRemover;