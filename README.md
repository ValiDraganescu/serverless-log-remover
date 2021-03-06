# Serverless cleanup
A plugin for the [Serverless Framework](https://serverless.com/).

It does what the name says (and more): cleans up logs from your JS code when you deploy your services.

I created it to remove logs after the compile step of the [serverless-plugin-typescript](https://github.com/prismagraphql/serverless-plugin-typescript)
It also works nice with the [serverless-offline](https://github.com/dherault/serverless-offline) plugin.

### How it works
You define your build folder and the log levels to be be removed. The log level can be defined in the logs section of the logRemover custom settings but you can also define a regex (extending it to basically remove whatever matches the regex).

Than you need to define on what stages to remove the logs (probably you need your debug logs for debug, so maybe remove them only on prod stage (`--stage prod` when you run `sls deploy`), and safely keep the "log" log level)

Now each time you run `sls deploy --stage prod` or `sls deploy --stage staging`, the debug logs will be removed and the rest of the logs (like log and info) will be kept.

### Features
1. remove logs like "debug", "log", "error"
2. remove comments: single line and multi line
3. remove any result of the given regex pattern

#### Install

`npm i serverless-cleanup`

### Version 0.2.0
Added the concept of jobs, now you can define many different jobs to work on different folders, see example.

#### Add the plugin to the plugins section of your serverless.yml
```yml
  plugins:
    - serverless-plugin-typescript
    - serverless-offline
    - serverless-cleanup
```
#### Example:
```yml
custom:
  cleanup:
    currentStage: ${opt:stage, 'dev'}
    jobs:
      - dir: ./.build
        logs:
          - debug
        comments: true
        tidyup: true
        patterns:
          - console.error\(.*\);? 
        stages:
          - prod
          - staging
      - dir: ./node_modules
        logs:
          - debug
          - log
          - info
        stages:
          - dev
          - qa
          - staging
          - prod
```

## Copyright
![alt text](eupl.jpg)

Distributed under [European Union Public License, version 1.2 (EUPL-1.2)](https://opensource.org/licenses/EUPL-1.1)
