/**
 * SPDX-FileCopyrightText: 2023 Ferdinand Thiessen <rpm@fthiessen.de>
 *
 * SPDX-License-Identifier: EUPL-1.2
 */

import { OutputOptions, rollup, RollupBuild } from "rollup"
import { corejsPlugin } from "../src/plugin"
import * as nodePath from "path"

function path(rel: string) {
    return nodePath.join(__dirname, rel)
}

async function getOutput(bundle: RollupBuild, customOpts: OutputOptions = {}) {
    const options: OutputOptions = { exports: "auto", format: "esm", ...customOpts };
    const output = await bundle.generate(options)
    return output.output
}

describe("CoreJS rollup plugin", () => {
    let old_env: any

    beforeAll(() => {
        old_env = Object.assign({}, process.env)
    })
    afterEach(() => {
        process.env = Object.assign({}, old_env)
    })

    it("imports core-js", async () => {
        const bundle = await rollup({
            input: "tests/fixtures/entry1.js",
            external: [/^core-js/],
            plugins: [
                corejsPlugin({
                    targets: "safari 4"
                })
            ],
        })
        const output = await getOutput(bundle)
        expect(output).toHaveLength(1)
        expect(output[0].imports).toContain("core-js/modules/es.array.includes.js")
    })

    it("imports only required core-js", async () => {
        const bundle = await rollup({
            input: path("fixtures/entry1.js"),
            external: [/^core-js/],
            plugins: [
                corejsPlugin({
                    targets: "safari 13"
                })
            ],
        })
        const output = await getOutput(bundle)
        expect(output).toHaveLength(1)
        expect(output[0].imports).not.toContain("core-js/modules/es.array.includes.js")
    })

    it("ignores excluded modules", async () => {
        const bundle = await rollup({
            input: "tests/fixtures/entry1.js",
            external: [/^core-js/],
            plugins: [
                corejsPlugin({
                    targets: "safari 4",
                    exclude: [
                        "core-js/modules/es.array.includes"
                    ]
                })
            ],
        })
        const output = await getOutput(bundle)
        expect(output).toHaveLength(1)
        expect(output[0].imports).not.toContain("core-js/modules/es.array.includes.js")
    })

    it("loads browserslist config", async () => {
        process.env.BROWSERSLIST_CONFIG = path("fixtures/browserslistrc")
        const bundle = await rollup({
            input: "tests/fixtures/entry1.js",
            external: [/^core-js/],
            plugins: [
                corejsPlugin({})
            ],
        })
        const output = await getOutput(bundle)
        expect(output).toHaveLength(1)
        expect(output[0].imports).not.toContain("core-js/modules/es.array.includes.js")
    })

    it("includes size summary", async () => {
        const bundle = await rollup({
            input: path("fixtures/entry1.js"),
            external: [/^core-js/],
            plugins: [
                corejsPlugin({
                    summary: {
                        modules: false,
                        size: true,
                    },
                })
            ],
        })
        const output = await getOutput(bundle)
        expect(output).toHaveLength(1)
        expect(/\* size: \d+\.\d+/.test(output[0].code)).toBe(true)
        expect(/\* modules:\n/.test(output[0].code)).toBe(false)
    })

    it("includes modules summary", async () => {
        const bundle = await rollup({
            input: path("fixtures/entry1.js"),
            external: [/^core-js/],
            plugins: [
                corejsPlugin({
                    summary: {
                        modules: true,
                        size: false,
                    },
                })
            ],
        })
        const output = await getOutput(bundle)
        expect(output).toHaveLength(1)
        expect(/\* size: \d+\.\d+/.test(output[0].code)).toBe(false)
        expect(/\* modules:\n/.test(output[0].code)).toBe(true)
    })
})