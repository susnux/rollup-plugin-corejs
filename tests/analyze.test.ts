/**
 * SPDX-FileCopyrightText: 2023 Ferdinand Thiessen <rpm@fthiessen.de>
 * SPDX-License-Identifier: EUPL-1.2
 */

import { parse } from 'acorn'
import {filterModules} from '../src/analyze'

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
// X-Fail as not implemented
test.failing('Can detect all esnext modules', () => {
    const ast = parseModule('')
    expect(filterModules(compat.modules.filter(v => v.startsWith('esnext.')), ast)).toBe([])
})