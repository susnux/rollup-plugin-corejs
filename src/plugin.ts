/**
 * SPDX-FileCopyrightText: 2023 Ferdinand Thiessen <rpm@fthiessen.de>
 *
 * SPDX-License-Identifier: EUPL-1.2
 */

import browserslist from "browserslist"
import { Plugin } from "rollup"

import compat from "core-js-compat"
import MagicString from "magic-string"
import { filterModules } from "./analyze"

type CoreJSOptions = Parameters<typeof compat.compat>[0]

export type CoreJSPluginOptions = Partial<
	Pick<CoreJSOptions, "targets" | "modules" | "exclude">
> & {
	/** Only include polyfills used by *your* code (dependencies are not checked) */
	usage?: boolean
}

export function corejsPlugin(
	options: CoreJSPluginOptions = { modules: "core-js/es" },
) {
	const config: CoreJSPluginOptions = {
		modules: options.modules,
		exclude: options.exclude,
		targets:
			options.targets ||
			(browserslist.findConfig(".") || browserslist.loadConfig({})
				? browserslist()
				: undefined),
	}

	if (process.env.NODE_ENV === "development") {
		console.debug("browser targets", config.targets)
	}

	return {
		name: "core-js",
		transform: {
			// run as the last plugin, required to work with the vue plugin
			order: "post",
			async handler(code, id) {
				const moduleInfo = this.getModuleInfo(id)
				if (
					!moduleInfo.isExternal &&
					!moduleInfo.id.includes("node_modules")
				) {
					let { list } = compat.compat({
						targets: config.targets,
						modules: config.modules,
						exclude: config.exclude,
					})
					if (config.usage) {
						const ast = this.parse(code)
						list = filterModules(list, ast)
					}
					const polyfills = list.map(
						(p) => `import 'core-js/modules/${p}.js';`,
					)

					const magicString = new MagicString(code)
					magicString.prepend(polyfills.join("\n"))

					return {
						code: magicString.toString(),
						map: magicString.generateMap({ hires: true }),
					}
				}
				return {
					code,
					map: null,
				}
			},
		},
	} as Plugin
}
