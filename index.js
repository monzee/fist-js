'use strict';

function enter(state) {
    return function (io) {
        io.enter(state);
    }
}

function reenter() {
    return function (io) {
        io.reenter();
    }
}

function run(action) {
    return function (io) {
        io.run(action);
    }
}

function raise(error) {
    return function (io) {
        io.raise(error);
    }
}

function fold(_varArgs) {
    var commands = Array.apply(null, arguments);
    return function (io) {
        for (var i in commands) {
            commands[i](io);
        }
    }
}

var Io = {
    enter: enter,
    reenter: reenter,
    run: run,
    raise: raise,
    fold: fold,
}

var Action = {
    enter: function (state) {
        return function () {
            return Io.enter(state);
        }
    },
    reenter: function () {
        return function () {
            return Io.reenter();
        }
    },
    run: function (_varArgs) {
        var commands = new Array(arguments.length);
        for (var i in arguments) {
            commands[i] = Io.run(arguments[i]);
        }
        return function () {
            return Io.fold.apply(Io, commands);
        }
    },
    raise: function (error) {
        return function () {
            return Io.raise(error);
        }
    },
    fold: function (_varArgs) {
        var args = Array.apply(null, arguments);
        return function () {
            return Io.fold.apply(Io, args);
        }
    },
}

function _isCallable(o) {
    return typeof o === 'function';
}

function bind(state, _effects, _options) {
    var effects = _effects || {};
    var options = _options || {};

    function raise(error) {
        if (!effects.onError) throw error;
        effects.onError(error);
    }

    function reenter() {
        if (_isCallable(state)) {
            state(effects);
        }
        else if (_isCallable(effects)) {
            effects(state);
        }
        else if (effects.onEnter) {
            effects.onEnter(state);
        }
    }

    function enter(newState) {
        if (newState.then) {
            newState.then(enter).catch(raise);
        }
        else {
            state = newState;
            reenter();
        }
    }

    function run(action) {
        if (action.then) {
            action.then(run.bind(this)).catch(raise);
        }
        else {
            var io = this;
            try {
                var cmd = action(state, effects);
                if (cmd === void 0) return;
                if (cmd.then) {
                    cmd.then(function (c) {
                        if (c === void 0) return;
                        if (_isCallable(c)) {
                            c(io);
                        }
                        else if (!options.strictReturn) {
                            enter(c);
                        }
                    }).catch(raise);
                }
                else if (_isCallable(cmd)) {
                    cmd(io);
                }
                else if (!options.strictReturn) {
                    enter(cmd);
                }
            }
            catch (e) {
                raise(e);
            }
        }
    }

    if (!options.silentStart) {
        reenter();
    }
    var io = {
        enter: enter,
        reenter: reenter,
        run: run,
        raise: raise,
    };
    return io.run.bind(io);
}

function whenify(union, _branchesAsString, _fallback) {
    var branchesAsString = _branchesAsString || {};
    var fallback = _fallback || 'otherwise';
    var branches = Object.getOwnPropertyNames(union).filter(function (k) {
        return _isCallable(union[k]);
    });
    return function (selector) {
        var missing = branches.filter(function (k) {
            return !selector.hasOwnProperty(k);
        });
        var hasFallback = selector.hasOwnProperty(fallback);
        for (var k in missing) {
            var branch = missing[k];
            if (hasFallback) {
                Object.defineProperty(selector, branch, {
                    value: function () {
                        return selector[fallback]();
                    }
                });
            }
            else !function (branch) {
                var repr = branchesAsString[branch];
                Object.defineProperty(selector, branch, {
                    value: function (_varArgs) {
                        var args = Array.apply(null, arguments);
                        return Io.raise({
                            message: 'No matching handler for state',
                            state: repr && repr.apply(null, args) || branch,
                            selector: selector,
                        });
                    }
                });
            }(branch);
        }
        return selector;
    }
}

module.exports = {
    Io: Io,
    Action: Action,
    bind: bind,
    whenify: whenify,
}
