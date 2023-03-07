/**
 * SPDX-FileCopyrightText: 2023 Ferdinand Thiessen <rpm@fthiessen.de>
 *
 * SPDX-License-Identifier: EUPL-1.2
 */

import typescript from "@rollup/plugin-typescript"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const pkg = require("./package.json")

const external = [
	...Object.keys(pkg.dependencies),
	...(pkg.peerDependencies ? Object.keys(pkg.peerDependencies) : []),
]

const config = (input, output) => ({
	input,
	external,
	plugins: [typescript({ declaration: output.format === "esm" })],
	output: [output],
})

export default [
	config("./src/index.ts", {
		file: "dist/index.es.mjs",
		format: "esm",
	}),
	config("./src/index.ts", {
		file: "dist/index.cjs",
		format: "cjs",
	}),
]
