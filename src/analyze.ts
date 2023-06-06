/**
 * The module is responsible for detecting usage of to-be-polyfilled APIs
 * It analyses the AST and filters a list of given polyfills to only include the needed ones.
 * Warning: Not all polyfills can be detected correct, meaning some polyfills might be included even if not really needed.
 * E.g. detecting member functions is hard, imaging you import `foo` from a third party module and call `foo.catch()`.
 * Is `catch` the `Promise.catch` method which needs to be polyfilled or is it some different `catch` function?
 *
 * @author Ferdinand Thiessen <rpm@fthiessen.de>
 * @license EUPL-1.2
 *
 * SPDX-FileCopyrightText: 2023 Ferdinand Thiessen <rpm@fthiessen.de>
 * SPDX-License-Identifier: EUPL-1.2
 *
 */

import { traverse, Visitor, Visitors } from "estree-toolkit"

enum PolyfillType {
	CallWithArguments,
	StaticMember,
	GenericMethod,
	GenericProperty,
	Global,
}

const PT = PolyfillType
type ModuleName = string
type Arguments = any[]
type ModuleEntry = [ModuleName, PolyfillType, string, ...Arguments]

/**
 * Core-Js 3.x contains some alias which will be removed with version 4.
 * This maps those aliases to the correct modules
 */
const aliasModules = {
	"es.aggregate-error": ["es.aggregate-error.constructor"],
	"es.data-view": ["es.data-view.constructor"],
	"es.map": ["es.map.constructor"],
	"es.promise": [
		"es.promise.constructor",
		"es.promise.all",
		"es.promise.catch",
		"es.promise.race",
		"es.promise.reject",
		"es.promise.resolve",
	],
	"es.set": ["es.set.constructor"],
	"es.symbol": [
		"es.symbol.constructor",
		"es.symbol.for",
		"es.symbol.key-for",
		"es.json.stringify",
		"es.object.get-own-property-symbols",
	],
	"es.weak-set": ["es.weak-set.constructor"],
	"es.weak-map": ["es.weak-map.constructor"],
}

export const detectableModules: ModuleEntry[] = [
	["es.aggregate-error.cause", PT.Global, "AggregateError"],
	["es.aggregate-error.constructor", PT.Global, "AggregateError"],
	// array buffer
	["es.array-buffer.constructor", PT.Global, "ArrayBuffer"],
	["es.array-buffer.is-view", PT.StaticMember, "ArrayBuffer", "isView"],
	["es.array-buffer.slice", PT.GenericMethod, "slice"],
	// array
	["es.array.at", PT.GenericMethod, "at"],
	["es.array.concat", PT.GenericMethod, "concat"],
	["es.array.copy-within", PT.GenericMethod, "copyWithin"],
	["es.array.every", PT.GenericMethod, "every"],
	["es.array.fill", PT.GenericMethod, "fill"],
	["es.array.filter", PT.GenericMethod, "filter"],
	["es.array.find-index", PT.GenericMethod, "findIndex"],
	["es.array.find-last-index", PT.GenericMethod, "findLastIndex"],
	["es.array.find-last", PT.GenericMethod, "findLast"],
	["es.array.find", PT.GenericMethod, "find"],
	["es.array.flat-map", PT.GenericMethod, "flatMap"],
	["es.array.flat", PT.GenericMethod, "flat"],
	["es.array.for-each", PT.GenericMethod, "forEach"],
	["es.array.from", PT.StaticMember, "Array", "from"],
	["es.array.includes", PT.GenericMethod, "includes"],
	["es.array.index-of", PT.GenericMethod, "indexOf"],
	["es.array.is-array", PT.StaticMember, "Array", "isArray"],
	["es.array.iterator", PT.GenericMethod, "entries"],
	["es.array.iterator", PT.GenericMethod, "keys"],
	["es.array.iterator", PT.GenericMethod, "values"],
	["es.array.join", PT.GenericMethod, "join"],
	["es.array.last-index-of", PT.GenericMethod, "lastIndexOf"],
	["es.array.map", PT.GenericMethod, "map"],
	["es.array.of", PT.StaticMember, "Array", "of"],
	["es.array.push", PT.GenericMethod, "push"],
	["es.array.reduce", PT.GenericMethod, "reduce"],
	["es.array.reduce-right", PT.GenericMethod, "reduceRight"],
	["es.array.reverse", PT.GenericMethod, "reverse"],
	["es.array.slice", PT.GenericMethod, "slice"],
	["es.array.some", PT.GenericMethod, "some"],
	["es.array.sort", PT.GenericMethod, "sort"],
	["es.array.splice", PT.GenericMethod, "splice"],
	["es.array.to-reversed", PT.GenericMethod, "toReversed"],
	["es.array.to-sorted", PT.GenericMethod, "toSorted"],
	["es.array.to-spliced", PT.GenericMethod, "toSpliced"],
	["es.array.unshift", PT.GenericMethod, "unshift"],
	["es.array.with", PT.GenericMethod, "with"],
	["es.array.species", PT.StaticMember, "Symbol", "species"],
	// TODO: es.array.unscopables.flat-map
	// TODO: es.array.unscopables.flat
	// data-view
	["es.data-view.constructor", PT.Global, "DataView"],
	// error
	// Not possible because toString might be called implicitly (template string):
	// es.error.to-string
	// function
	["es.function.bind", PT.GenericMethod, "bind"],
	["es.function.has-instance", PT.StaticMember, "Symbol", "hasInstance"],
	["es.function.name", PT.GenericProperty, "name"],
	// globalThis
	["es.global-this", PT.Global, "globalThis"],
	// json
	["es.json.stringify", PT.StaticMember, "JSON", "stringify"],
	// map
	["es.map.constructor", PT.Global, "Map"],
	// number
	["es.number.constructor", PT.Global, "Number"],
	// object
	["es.object.assign", PT.StaticMember, "Object", "assign"],
	[
		"es.object.get-own-property-symbols",
		PT.StaticMember,
		"Object",
		"getOwnPropertySymbols",
	],
	["es.object.has-own", PT.StaticMember, "Object", "hasOwn"],
	["es.object.keys", PT.StaticMember, "Object", "keys"],
	["es.object.values", PT.StaticMember, "Object", "values"],
	// parse-x
	["es.parse-float", PT.Global, "parseFloat"],
	["es.parse-int", PT.Global, "parseInt"],
	// promise
	["es.promise.all", PT.StaticMember, "Promise", "all"],
	["es.promise.all-settled", PT.StaticMember, "Promise", "allSettled"],
	["es.promise.any", PT.StaticMember, "Promise", "any", "es.promise.any"],
	["es.promise.catch", PT.GenericMethod, "catch"],
	["es.promise.constructor", PT.Global, "Promise"],
	["es.promise.race", PT.StaticMember, "Promise", "race"],
	["es.promise.reject", PT.StaticMember, "Promise", "reject"],
	["es.promise.resolve", PT.StaticMember, "Promise", "resolve"],
	["es.promise.finally", PT.GenericMethod, "finally"],
	// RegExp
	["es.regexp.constructor", PT.Global, "RegExp"],
	// TODO "es.regexp.dot-all"
	// TODO "es.regexp.exec"
	["es.regexp.flags", PT.GenericProperty, "flags"],
	// TODO "es.regexp.sticky"
	// TODO "es.regexp.test"
	// TODO "es.regexp.to-string"
	// set
	["es.set.constructor", PT.Global, "Set"],
	// string
	["es.string.at-alternative", PT.GenericMethod, "at"],
	["es.string.match", PT.GenericMethod, "match"],
	["es.string.match-all", PT.GenericMethod, "matchAll"],
	["es.string.repeat", PT.GenericMethod, "repeat"],
	["es.string.replace", PT.GenericMethod, "replace"],
	["es.string.replace-all", PT.GenericMethod, "replaceAll"],
	// symbol
	["es.symbol.async-iterator", PT.StaticMember, "Symbol", "asyncIterator"],
	["es.symbol.constructor", PT.Global, "Symbol"],
	["es.symbol.description", PT.GenericProperty, "description"],
	["es.symbol.for", PT.StaticMember, "Symbol", "for"],
	["es.symbol.has-instance", PT.StaticMember, "Symbol", "hasInstance"],
	[
		"es.symbol.is-concat-spreadable",
		PT.StaticMember,
		"Symbol",
		"isConcatSpreadable",
	],
	["es.symbol.iterator", PT.StaticMember, "Symbol", "iterator"],
	["es.symbol.key-for", PT.StaticMember, "Symbol", "keyFor"],
	["es.symbol.match-all", PT.StaticMember, "Symbol", "matchAll"],
	["es.symbol.match", PT.StaticMember, "Symbol", "match"],
	["es.symbol.replace", PT.StaticMember, "Symbol", "replace"],
	["es.symbol.search", PT.StaticMember, "Symbol", "search"],
	["es.symbol.species", PT.StaticMember, "Symbol", "species"],
	["es.symbol.split", PT.StaticMember, "Symbol", "split"],
	["es.symbol.to-primitive", PT.StaticMember, "Symbol", "toPrimitive"],
	["es.symbol.to-string-tag", PT.StaticMember, "Symbol", "toStringTag"],
	["es.symbol.unscopables", PT.StaticMember, "Symbol", "unscopables"],
	// typed array
	["es.typed-array.at", PT.GenericMethod, "at"],
	["es.typed-array.fill", PT.GenericMethod, "fill"],
	["es.typed-array.find-index", PT.GenericMethod, "findIndex"],
	["es.typed-array.find-last-index", PT.GenericMethod, "findLastIndex"],
	["es.typed-array.find-last", PT.GenericMethod, "findlast"],
	["es.typed-array.find", PT.GenericMethod, "find"],
	["es.typed-array.float32-array", PT.Global, "Float32Array"],
	["es.typed-array.float64-array", PT.Global, "Float64Array"],
	["es.typed-array.for-each", PT.GenericMethod, "forEach"],
	["es.typed-array.set", PT.GenericMethod, "set"],
	["es.typed-array.sort", PT.GenericMethod, "sort"],
	["es.typed-array.to-locale-string", PT.GenericMethod, "toLocalString"],
	["es.typed-array.to-reversed", PT.GenericMethod, "toReversed"],
	["es.typed-array.to-sorted", PT.GenericMethod, "toSorted"],
	["es.typed-array.to-string", PT.GenericMethod, "toString"],
	["es.typed-array.with", PT.GenericMethod, "with"],
	// un-/escape
	["es.escape", PT.Global, "escape"],
	["es.unescape", PT.Global, "unescape"],
	// Weak
	["es.weak-map.constructor", PT.Global, "WeakMap"],
	["es.weak-set.constructor", PT.Global, "WeakSet"],
]

/**
 * Typed array constructors
 */
;(() =>
	[
		["Float32Array", "es.typed-array.float32-array"],
		["Float64Array", "es.typed-array.float64-array"],
		["Int8Array", "es.typed-array.int8-array"],
		["Int16Array", "es.typed-array.int16-array"],
		["Int32Array", "es.typed-array.int32-array"],
		["Uint8Array", "es.typed-array.uint8-array"],
		["Uint8ClampedArray", "es.typed-array.uint8-clamped-array"],
		["Uint16Array", "es.typed-array.uint16-array"],
		["Uint32Array", "es.typed-array.uint32-array"],
	].map(([name, module]) => {
		detectableModules.push(
			["es.typed-array.from", PT.StaticMember, name, "from"],
			["es.typed-array.of", PT.StaticMember, name, "of"],
			[module, PT.Global, name]
		)
	}))()
/**
 * Init detection of math functions
 */
;(() =>
	[
		"es.math.acosh",
		"es.math.asinh",
		"es.math.atanh",
		"es.math.cbrt",
		"es.math.clz32",
		"es.math.cosh",
		"es.math.expm1",
		"es.math.fround",
		"es.math.hypot",
		"es.math.imul",
		"es.math.log10",
		"es.math.log1p",
		"es.math.log2",
		"es.math.sign",
		"es.math.sinh",
		"es.math.tanh",
		"es.math.trunc",
	].forEach((m) => {
		detectableModules.push([
			m,
			PT.StaticMember,
			"Math",
			m.split(".").at(-1),
		])
	}))()

/**
 * Init detection of error
 */
;(() =>
	[
		"Error",
		"EvalError",
		"RangeError",
		"ReferenceError",
		"SyntaxError",
		"TypeError",
		"URIError",
		"CompileError",
		"LinkError",
		"RuntimeError",
	].forEach((error) => {
		detectableModules.push([
			"es.error.cause",
			PT.CallWithArguments,
			error,
			(args: Array<unknown>) => args.length === 2,
		])
	}))()

/**
 * Init detection of static Number functions
 */
;(() =>
	[
		["es.number.epsilon", "EPSILON"],
		["es.number.is-finite", "isFinite"],
		["es.number.is-integer", "isInteger"],
		["es.number.is-nan", "isNaN"],
		["es.number.is-safe-integer", "isSafeInteger"],
		["es.number.max-safe-integer", "MAX_SAFE_INTEGER"],
		["es.number.min-safe-integer", "MIN_SAFE_INTEGER"],
		["es.number.parse-float", "parseFloat"],
		["es.number.parse-int", "parseInt"],
		["es.number.is-integer", "isInteger"],
		// TODO: es.number.to-exponential
		// TODO: es.number.to-fixed
		// TODO: es.number.to-precision
	].forEach(([mod, fn]) => {
		detectableModules.push([mod, PT.StaticMember, "Number", fn])
	}))()

class Walker {
	_modules: string[] = []
	_globals = new Map<string, string>()
	_methods = new Map<string, Array<string>>()
	_members = new Map<string, readonly string[]>()
	_properties = new Map<string, Array<string>>()
	_calls = new Map<string, Array<any>>()

	registerModules(modules: ModuleEntry[], filterModules: string[]) {
		const usedModules: string[] = []
		modules.forEach(([name, type, ...rest]) => {
			if (!filterModules || filterModules.includes(name)) {
				switch (type) {
					case PolyfillType.GenericMethod:
						this.registerGenericMethod(name, rest[0])
						break
					case PolyfillType.GenericProperty:
						this.registerGenericProperty(name, rest[0])
						break
					case PolyfillType.Global:
						this.registerGlobal(name, rest[0])
						break
					case PolyfillType.StaticMember:
						this.registerMember(name, rest[0], rest[1])
						break
					case PolyfillType.CallWithArguments:
						this.registerCall(name, rest[0], rest[1])
						break
				}
				usedModules.push(name)
			}
		})
		this._modules.push(
			...filterModules.filter((m) => !usedModules.includes(m))
		)
	}

	registerMember(module: string, object: string, property: string) {
		this._members.set(object, [property, module])
	}

	registerGlobal(module: string, name: string) {
		this._globals.set(name, module)
	}

	registerGenericProperty(module: string, property: string) {
		if (!this._properties.has(property)) {
			this._properties.set(property, [])
		}
		this._properties.get(property).push(module)
	}

	registerGenericMethod(module: string, method: string) {
		if (!this._methods.has(method)) {
			this._methods.set(method, [])
		}
		this._methods.get(method).push(module)
	}

	registerCall(
		module: string,
		object: string,
		validator: (args: Array<unknown>) => boolean
	) {
		if (!this._calls.has(object)) {
			this._calls.set(object, [])
		}
		this._calls.get(object).push({ module, validator })
	}

	getVisitors(): Visitors<any> {
		return {
			Program(path, state: Walker) {
				state._globals.forEach((module, global) => {
					if (global in path.scope.globalBindings) {
						state._modules.push(module)
					}
				})
			},

			CallExpression(path, state: Walker) {
				if (path.node.callee.type === "Identifier") {
					if (state._calls.has(path.node.callee.name)) {
						state._calls.get(path.node.callee.name).forEach((v) => {
							if (v.validator(path.node.arguments))
								state._modules.push(v.module)
						})
					}
				}
			},

			NewExpression(path, state: Walker) {
				if (path.node.callee.type === "Identifier") {
					if (state._calls.has(path.node.callee.name)) {
						state._calls.get(path.node.callee.name).forEach((v) => {
							if (v.validator(path.node.arguments))
								state._modules.push(v.module)
						})
					}
				}
			},

			MemberExpression(path, state: Walker) {
				if (path.node.object.type === "Identifier") {
					const property =
						path.node.property.type === "Identifier"
							? path.node.property.name
							: path.node.property.type === "Literal" &&
							  typeof path.node.property.value === "string"
							? path.node.property.value
							: undefined
					if (!property) return

					// Static members (e.g. `Object.assign`)
					if (state._members.has(path.node.object.name)) {
						const [prop, module] = state._members.get(
							path.node.object.name
						)
						if (property === prop) {
							state._modules.push(module)
						}
					}

					// Check generic properties and methods like `foo.catch()`
					if (path.parent.type === "CallExpression") {
						if (state._methods.has(property)) {
							state._modules.push(...state._methods.get(property))
						}
					} else if (state._properties.has(property)) {
						console.warn("props: ", state._properties, property)
						state._modules.push(...state._properties.get(property))
					}
				}
			},
		}
	}
}

export function filterModules(modules: readonly string[], ast: any) {
	const realModules: string[] = []
	modules.forEach((m) => {
		if (m in aliasModules) realModules.push(...aliasModules[m])
		else realModules.push(m)
	})

	const walker = new Walker()
	walker.registerModules(detectableModules, realModules)

	traverse(
		ast,
		Object.assign(walker.getVisitors(), {
			$: {
				scope: true,
			},
		}),
		walker
	)
	return [...new Set(walker._modules)]
}
