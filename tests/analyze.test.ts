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
    expect(filterModules(['es.math.cosh'], ast0).sort()).toEqual([].sort())
})