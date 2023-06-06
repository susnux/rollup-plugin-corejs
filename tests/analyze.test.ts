/**
 * SPDX-FileCopyrightText: 2023 Ferdinand Thiessen <rpm@fthiessen.de>
 * SPDX-License-Identifier: EUPL-1.2
 */

import { parse } from 'acorn'
import {detectableModules, filterModules} from '../src/analyze'
import compat from 'core-js-compat';

const parseModule = (code: string) => parse(code, { ecmaVersion: 'latest' })
test('keep all used', () => {
    const ast = parseModule(`
    const fx = Symbol('fx');
    const dx = Symbol.for('foo')
    `);

    expect(filterModules(['es.symbol.constructor', 'es.symbol.for'], ast).sort()).toEqual(['es.symbol.constructor', 'es.symbol.for'].sort())
})

test('remove all unused', () => {
    const ast = parseModule(`
    const fx = String('fx');
    `);

    expect(filterModules(['es.symbol.constructor', 'es.symbol.for'], ast)).toEqual([])
})

test('filter one (un)used', () => {
    const ast = parseModule(`
        Math.cosh(0.1)
    `);
    const ast0 = parseModule(`
        Math.sinh(0.1)
    `);

    expect(filterModules(['es.math.cosh'], ast).sort()).toEqual(['es.math.cosh'].sort())
    expect(filterModules(['es.math.cosh'], ast0)).toEqual([])
})

test('Can detect errors with cause', () => {
    const ast = parseModule(`
        new RangeError('foo', { cause: e});
    `)
    const ast0 = parseModule('')

    expect(filterModules(['es.error.cause'], ast0)).toEqual([])
    expect(filterModules(['es.error.cause'], ast)).toEqual(['es.error.cause'])
})

// X-Fail as es.string classes are currently missing
test.failing('Can detect all ES modules', () => {
    const ast = parseModule('')
    expect(
        filterModules(compat.modules.filter(v => v.startsWith('es.')), ast)
    ).toBe([
        // can not detect this
        'es.error.to-string'
    ])
})

// X-Fail as not implemented
test.failing('Can detect all esnext modules', () => {
    const ast = parseModule('')
    expect(filterModules(compat.modules.filter(v => v.startsWith('esnext.')), ast)).toBe([])
})

// X-Fail as not implemented
test.failing('Can detect all web modules', () => {
    const ast = parseModule('')
    expect(filterModules(compat.modules.filter(v => v.startsWith('web.')), ast)).toBe([])
})

test('All modules exist', async () => {
    let failed = false
    
    const all = detectableModules.map(mod => import(`core-js/modules/${mod[0]}.js`))
    try {
        await Promise.all(all)
    } catch(e) {
        expect(e).toBe('')
    }
})