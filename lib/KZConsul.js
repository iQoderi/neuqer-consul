const Consul = require('consul');
const TypeFlags = require('./TypeFlags');
const ActionType = require('./ActionType');

const noOp = function noOp() {};
const parseItemValue = (item) => {
    if (item.Flags === TypeFlags.STRING) {
        return item.Value;
    } else if (item.Flags === TypeFlags.JSON) {
        return JSON.parse(item.Value);
    } else {
        throw new Error(`Unsupported flag: ${item.Flags}`);
    }
};

const parseValue = (results, key) => {
    let oResult = results;
    if (!oResult) return null;
    if (oResult.length === 1) {
        return parseItemValue(oResult[0]);
    }

    const obj = {};
    oResult.forEach((item) => {
        if (item.Key === key) {
            return;
        }
        let name = item.Key.replace(key, '');
        if (name.startsWith('/')) {
            name = name.substr(1);
        }

        let parts = name.split('/');
        let curObj = obj;
        let part = parts.shift();
        while (parts.length > 0) {
            curObj[part] = {};
            curObj = curObj[part];
            part = parts.shift();
        }
        if (part !== '') {
            curObj[part] = parseItemValue(item);
        }
    });
    return obj;
};

const dispatch = (pools = [], err, data) => {
    pools.forEach((pool) => {
        if (typeof pool === 'function') {
            pool(err, data);
        } else {
            throw new Error('function dispatch`s arguments pools member must be a function');
        }
    });
};

function process(result) {
    const changeItems = [];
    const changeItem = {};
    const filterResult = (type, obj) => {
        changeItem.type = type;
        changeItem.key = obj.Key;
        changeItem.value = obj.Value;
        changeItems.push(changeItem);
    };

    this.preValues.forEach((item1) => {
        let flag = 0;
        for (let i = 0; i < result.length; i += 1) {
            if (result[i].Key === item1.Key) {
                flag = 1;
                break;
            }
        }

        if (flag === 0) {
            filterResult(ActionType.REMOVE, item1);
        }
    });


    result.forEach((item1) => {
        let flag = 0;
        this.preValues.forEach((item2) => {
            if (item1.Key === item2.Key) {
                flag = 1;
                if (item1.ModifyIndex !== item2.ModifyIndex) {
                    filterResult(ActionType.UPDATE, item1);
                }
            }
        });

        if (flag === 0) {
            filterResult(ActionType.ADD, item1);
        }
    });

    this.preValues = result;
    changeItems.forEach((item) => {
        Object.keys(this.callbacks).forEach((key) => {
            const regx = new RegExp(`^${key}`);
            if (item.key.match(regx)) {
                dispatch(this.callbacks[key], null, item);
            }
        });
    });
}

class KZConsul {
    constructor(conf) {
        const { host, port, secure, keyPrefix = '', onError = () => {} } = conf;
        this.onError = onError;
        this.consulClient = Consul({ host, port, secure });
        this.preValues = [];
        this.callbacks = {};
        this.inited = true;

        if ('' !== keyPrefix) {
            this.keyPrefix = keyPrefix.endsWith('/') ? keyPrefix : `${keyPrefix}/`;
        }
    }

    setValue({ key, value, dataType = TypeFlags.STRING, callback = noOp }) {
        if (typeof value === 'object') {
            if (Array.isArray(value)) {
                return this.setValue(key, JSON.stringify(value), TypeFlags.JSON);
            }
            Object.keys(value).forEach((name) => {
                const path = `${key}'/'${name}`;
                this.setValue(path, value[name]);
            });
        } else {
            this.consulClient.kv.set(this.keyPrefix + key, String(value), {
                flags: dataType,
            }, callback);
        }

        return this;
    }

    getValue(key, callback) {
        this.consulClient.kv.get({
            key: this.keyPrefix + key,
            recurse: true,
        }, (err, result) => {
            if (err) return callback(err);
            const parsedResult = parseValue(result, `${this.keyPrefix}${key}`);
            return callback(null, parsedResult);
        });
    }

    openWatch() {
        const consulClient = this.consulClient;
        const key = this.keyPrefix;
        const watchConfig = {
            method: consulClient.kv.get,
            options: {
                key,
                recurse: true,
            },
        };

        const watcher = consulClient.watch(watchConfig);

        watcher.on('change', (data) => {
            if (this.inited) {
                this.preValues = data;
                this.inited = false;
            } else {
                process.call(this, data);
            }
        });

        watcher.on('error', (err) => {
            if (typeof this.onError !== 'function') {
                throw new Error('KZConsul`s options onError must be a function');
            } else {
                this.onError(err);
            }
        });

        return this;
    }

    addWatcher(path, callback) {
        const key = this.keyPrefix + path;
        if (!this.callbacks[key]) {
            this.callbacks[key] = [];
        }
        this.callbacks[key].push(callback);
        return this;
    }
}

module.exports = KZConsul;
