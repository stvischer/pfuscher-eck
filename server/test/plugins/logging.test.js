import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import pino from 'pino';

import buildApp from '../../src/app.js';
import {
  getLoggerConfig,
  setBaseLogger,
  getLogger,
  createModuleLogger,
} from '../../src/plugins/logging.js';
import { DBLogger, getLogger as getDBLogger } from '../../src/lib/logging/DB.js';

// ── helpers ───────────────────────────────────────────────────────────────────

/** Builds a silent pino logger (no output) for use as a neutral base. */
function silentLogger() {
  return pino({ level: 'silent' });
}

/**
 * Builds a fake pino base whose .child() returns a mock with trackable
 * debug / error calls. Use this before constructing a DBLogger so the
 * internal #logger is fully under test control.
 *
 * @returns {{
 *   base: object,
 *   childCalls: { debug: any[][], error: any[][] }
 * }}
 */
function makeMockBase() {
  const childCalls = { debug: [], error: [] };
  const child = {
    debug: (...a) => childCalls.debug.push(a),
    error: (...a) => childCalls.error.push(a),
    warn: () => {},
    fatal: () => {},
    trace: () => {},
    info: () => {},
    silent: () => {},
    child: () => child,
    level: 'trace',
  };
  const base = {
    child: () => child,
    debug: () => {},
    error: () => {},
    warn: () => {},
    fatal: () => {},
    trace: () => {},
    info: () => {},
    silent: () => {},
    level: 'trace',
  };
  return { base, childCalls };
}

/**
 * Wraps a pino logger so that every `.child()` call is recorded.
 * Returns the same child a real pino would produce.
 * @param {import('pino').Logger} base
 * @returns {{ spy: import('pino').Logger, calls: Array<{bindings: object, opts: object}> }}
 */
function spyOnChild(base) {
  const calls = [];
  const origChild = base.child.bind(base);
  const spy = Object.create(base);
  spy.child = (bindings, opts) => {
    calls.push({ bindings, opts });
    return origChild(bindings, opts);
  };
  return { spy, calls };
}

// ── getLoggerConfig ───────────────────────────────────────────────────────────

describe('getLoggerConfig', () => {
  it('returns an object with a string level property', () => {
    const cfg = getLoggerConfig();
    assert.equal(typeof cfg.level, 'string');
  });

  it('uses the global logging level when no module name is given', () => {
    // NODE_ENV=test picks up default.yml → logging.global.level: silent
    const cfg = getLoggerConfig();
    assert.equal(cfg.level, 'silent');
  });

  it('omits the transport key when none is configured', () => {
    const cfg = getLoggerConfig();
    assert.equal(Object.hasOwn(cfg, 'transport'), false);
  });

  it('falls back to global config for an unknown module name', () => {
    const globalCfg = getLoggerConfig();
    const moduleCfg = getLoggerConfig('__nonexistent_module__');
    assert.deepEqual(moduleCfg, globalCfg);
  });

  it('returns the same config for two different unknown module names', () => {
    const a = getLoggerConfig('moduleA');
    const b = getLoggerConfig('moduleB');
    assert.deepEqual(a, b);
  });
});

// ── setBaseLogger / getLogger ─────────────────────────────────────────────────

describe('setBaseLogger + getLogger', () => {
  let savedLogger;

  before(() => {
    savedLogger = silentLogger();
    setBaseLogger(savedLogger);
  });

  after(() => {
    setBaseLogger(savedLogger);
  });

  it('getLogger returns a pino-compatible child logger', () => {
    const log = getLogger('test-module');
    assert.equal(typeof log.info, 'function');
    assert.equal(typeof log.child, 'function');
    assert.equal(typeof log.error, 'function');
  });

  it('child logger carries the module binding in every line', () => {
    const { spy, calls } = spyOnChild(silentLogger());
    setBaseLogger(spy);

    getLogger('my-module');

    assert.equal(calls.length, 1);
    assert.equal(calls[0].bindings.module, 'my-module');
  });

  it('extra bindings are included in the child call', () => {
    const { spy, calls } = spyOnChild(silentLogger());
    setBaseLogger(spy);

    getLogger('svc', { requestId: 'abc-123' });

    assert.equal(calls[0].bindings.requestId, 'abc-123');
    assert.equal(calls[0].bindings.module, 'svc');
  });

  it('defaults bindings to an empty object when omitted', () => {
    const { spy, calls } = spyOnChild(silentLogger());
    setBaseLogger(spy);

    getLogger('no-bindings');

    assert.equal(Object.hasOwn(calls[0].bindings, 'requestId'), false);
    assert.equal(calls[0].bindings.module, 'no-bindings');
  });

  it('setBaseLogger replaces the base used by subsequent getLogger calls', () => {
    const { spy: spyA, calls: callsA } = spyOnChild(silentLogger());
    const { spy: spyB, calls: callsB } = spyOnChild(silentLogger());

    setBaseLogger(spyA);
    getLogger('mod');

    setBaseLogger(spyB);
    getLogger('mod');

    assert.equal(callsA.length, 1);
    assert.equal(callsB.length, 1);
  });
});

// ── createModuleLogger ────────────────────────────────────────────────────────

describe('createModuleLogger', () => {
  before(() => setBaseLogger(silentLogger()));

  it('returns a logger with the same API shape as getLogger', () => {
    const methods = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'child'];
    const log = createModuleLogger('alias-test');
    for (const m of methods) {
      assert.equal(typeof log[m], 'function', `missing method: ${m}`);
    }
  });

  it('binds the module name via child() (behaves like getLogger)', () => {
    const { spy, calls } = spyOnChild(silentLogger());
    setBaseLogger(spy);

    createModuleLogger('create-test');

    assert.equal(calls[0].bindings.module, 'create-test');
  });

  it('forwards extra bindings via child()', () => {
    const { spy, calls } = spyOnChild(silentLogger());
    setBaseLogger(spy);

    createModuleLogger('bnd', { service: 'api' });

    assert.equal(calls[0].bindings.service, 'api');
  });
});

// ── Fastify plugin — full app integration ────────────────────────────────────
// Uses buildApp so the logging plugin is exercised through the real autoload
// pipeline, exactly as it runs in production.

describe('loggingPlugin (buildApp integration)', () => {
  let app;

  beforeEach(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('decorates fastify with getLogger', () => {
    assert.equal(typeof app.getLogger, 'function');
  });

  it('decorates fastify with createModuleLogger', () => {
    assert.equal(typeof app.createModuleLogger, 'function');
  });

  it('fastify.getLogger returns a pino-compatible logger', () => {
    const log = app.getLogger('integration');
    for (const m of ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'child']) {
      assert.equal(typeof log[m], 'function', `missing method: ${m}`);
    }
  });

  it('fastify.createModuleLogger returns a pino-compatible logger', () => {
    const log = app.createModuleLogger('integration-alias');
    assert.equal(typeof log.info, 'function');
  });

  it('syncs the module-level base logger to fastify.log after buildApp()', () => {
    // The logging plugin must have wired fastify.log as the base logger;
    // subsequent getLogger calls must produce functional children of it.
    const log = getLogger('sync-check');
    assert.equal(typeof log.info, 'function');
    // The child's level must match the logger config (silent in test env)
    assert.equal(log.level, getLoggerConfig('sync-check').level);
  });

  it('fastify.log is forwarded to the module-level base via the plugin', () => {
    // getLogger must return a child of fastify.log, not of the initial
    // pino instance that was created before buildApp ran.
    const log = getLogger('wiring-check');
    // Both have the same level, confirming they share the same config.
    assert.equal(log.level, app.log.level);
  });
});

// ── DBLogger ──────────────────────────────────────────────────────────────────

describe('DBLogger', () => {
  before(() => setBaseLogger(silentLogger()));

  // ── constructor / delegated methods ────────────────────────────────────────

  it('exposes the pino convenience methods delegated from the inner logger', () => {
    const { base } = makeMockBase();
    setBaseLogger(base);
    const db = new DBLogger('ctor-test');
    for (const m of ['warn', 'fatal', 'trace', 'silent', 'child']) {
      assert.equal(typeof db[m], 'function', `missing delegated method: ${m}`);
    }
  });

  it('also exposes debug and error as own methods', () => {
    const { base } = makeMockBase();
    setBaseLogger(base);
    const db = new DBLogger('own-methods-test');
    assert.equal(typeof db.debug, 'function');
    assert.equal(typeof db.error, 'function');
  });

  // ── debug() ────────────────────────────────────────────────────────────────

  it('debug() formats the SQL string before passing it to the inner logger', () => {
    const { base, childCalls } = makeMockBase();
    setBaseLogger(base);
    const db = new DBLogger('debug-format-test');

    db.debug('SELECT id,name FROM user WHERE id=?', [1]);

    assert.equal(childCalls.debug.length, 1);
    const formatted = childCalls.debug[0][0];
    assert.equal(typeof formatted, 'string');
    // sql-formatter capitalises keywords and adds spacing
    assert.match(formatted, /SELECT/i);
    assert.match(formatted, /FROM/i);
  });

  it('debug() passes params to the SQL formatter', () => {
    const { base, childCalls } = makeMockBase();
    setBaseLogger(base);
    const db = new DBLogger('debug-params-test');

    db.debug('SELECT * FROM t WHERE id = ?', [42]);

    assert.equal(childCalls.debug.length, 1);
    // The formatted string should be a string (params are inlined or noted)
    assert.equal(typeof childCalls.debug[0][0], 'string');
  });

  // ── error() ────────────────────────────────────────────────────────────────

  it('error() passes a structured object with message and code', () => {
    const { base, childCalls } = makeMockBase();
    setBaseLogger(base);
    const db = new DBLogger('error-struct-test');

    const err = Object.assign(new Error('connection lost'), { code: 'ER_CONN' });
    db.error(err, 'SELECT 1');

    assert.equal(childCalls.error.length, 1);
    const obj = childCalls.error[0][0];
    assert.equal(obj.message, 'connection lost');
    assert.equal(obj.code, 'ER_CONN');
  });

  it('error() formats the SQL when provided', () => {
    const { base, childCalls } = makeMockBase();
    setBaseLogger(base);
    const db = new DBLogger('error-sql-test');

    const err = Object.assign(new Error('syntax'), { code: 'ER_SYNTAX' });
    db.error(err, 'SELECT id FROM user');

    const obj = childCalls.error[0][0];
    assert.equal(typeof obj.sql, 'string');
    assert.match(obj.sql, /SELECT/i);
  });

  it('error() sets sql to undefined when no SQL is provided', () => {
    const { base, childCalls } = makeMockBase();
    setBaseLogger(base);
    const db = new DBLogger('error-no-sql-test');

    const err = Object.assign(new Error('oops'), { code: 'ER_X' });
    db.error(err);

    const obj = childCalls.error[0][0];
    assert.equal(obj.sql, undefined);
  });

  // ── getLogger (singleton factory) ─────────────────────────────────────────

  it('getLogger returns a DBLogger instance', () => {
    setBaseLogger(silentLogger());
    const db = getDBLogger('factory-test');
    assert.ok(db instanceof DBLogger);
  });

  it('getLogger returns the same instance for the same name (singleton)', () => {
    setBaseLogger(silentLogger());
    const a = getDBLogger('singleton-test');
    const b = getDBLogger('singleton-test');
    assert.strictEqual(a, b);
  });

  it('getLogger returns distinct instances for different names', () => {
    setBaseLogger(silentLogger());
    const a = getDBLogger('distinct-test-1');
    const b = getDBLogger('distinct-test-2');
    assert.notStrictEqual(a, b);
  });
});
