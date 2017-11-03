const assert = require('assert');
const { Io, Action, bind, whenify } = require('../index');

const expect = e => a => assert.equal(a, e);

describe('Basics', () => {
    it('can access state by calling with an (any -> ())', () => {
        let counter = bind(0, {});
        counter(expect(0));
    });

    it('can replace the state with Io#enter(any)', () => {
        let counter = bind(0, {});
        counter(n => Io.enter(n + 1));
        counter(expect(1));
        counter(n => Io.enter(n + 99));
        counter(expect(100));
    });

    it('can run a function when a new state is entered', () => {
        let count = 0;
        let foo = bind('foo', {
            onEnter: _ => count++,
        });
        assert.equal(count, 1);
        foo(s => Io.enter(s + 'bar'));
        assert.equal(count, 2);
        foo(expect('foobar'));
    });

    it('can trigger the enter function with Io#reenter()', () => {
        let count = 0;
        let foo = bind('foo', {
            onEnter: _ => count++,
        });
        assert.equal(count, 1);
        foo(_ => Io.reenter());
        assert.equal(count, 2);
    });

    it('can disable initial call to enter function', () => {
        let count = 0;
        let foo = bind('foo', {
            onEnter: _ => count++,
        }, {silentStart: true});
        assert.equal(count, 0);
        foo(_ => Io.reenter());
        assert.equal(count, 1);
    });

    it('#run(any -> any) is actually the same as #run(any -> Io#enter(any))', () => {
        let num = bind(0, {});
        num(_ => 'whatever');
        num(expect('whatever'));
    });

    it('#run(any -> ()) does not modify the state', () => {
        let called = false;
        let num = bind(0, {});
        num(_ => { called = true });
        assert(called);
        num(expect(0));
    });

    it('can run an inner action with Io#run(any -> any)', () => {
        let foo = bind('foo', {});
        foo(_ => Io.run(expect('foo')));
    });

    it('can fold state changes made by Io#run(any -> Io)', () => {
        let bar = bind('foo', {});
        bar(_ => Io.run(s => Io.enter(s + 'bar')));
        bar(expect('foobar'));
    });

    it('can execute a series of state changes with Io#fold(...Io#run(a -> a))', () => {
        let inc = n => n + 1;
        let num = bind(0, {});
        num(_ => Io.fold(Io.run(inc), Io.run(inc), Io.run(inc)));
        num(expect(3));
    });

    it('can throw exceptions using Io#raise(e)', () => {
        let num = bind(0, {});
        assert.throws(() => num(_ => Io.raise('foo')), 'foo');
    });

    it('can catch exceptions with #onError(e)', () => {
        let error;
        let num = bind(0, {
            onError: e => error = e,
        });
        assert.strictEqual(error, void 0);
        num(_ => Io.raise('hi'));
        assert.equal(error, 'hi');
    });

    it('can catch errors thrown in actions', () => {
        let error;
        let num = bind(0, {
            onError: e => error = e,
        });
        num(_ => { throw 'hello' });
        assert.equal(error, 'hello');
    });
});

describe('Shortcuts', () => {
    it("can use Action methods if the current state isn't needed", () => {
        let count = 0;
        let error;
        let num = bind(0, {
            onEnter: _ => count++,
            onError: e => error = e,
        });

        num(Action.enter(100));
        num(expect(100));
        assert.equal(count, 2);

        num(Action.reenter());
        num(Action.reenter());
        num(Action.reenter());
        assert.equal(count, 5);

        num(Action.raise('hello'));
        assert.equal(error, 'hello');
    });

    it("can use the second arg to #bind() as the enter function", () => {
        let count = 0;
        let num = bind(0, _ => count++);
        assert.equal(count, 1);
        num(Action.enter(-1));
        assert.equal(count, 2);
    });

    it("can run a sequence of actions with Action#run(...(any -> any))", () => {
        let num = bind(0, {});
        let plus = n => m => n + m;
        num(Action.run(plus(1), plus(-10), plus(300)));
        num(expect(291));
    });
});
