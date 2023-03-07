/**
 * SPDX-FileCopyrightText: 2023 Ferdinand Thiessen <rpm@fthiessen.de>
 *
 * SPDX-License-Identifier: EUPL-1.2
 */

import browserslist from "browserslist"
import { Plugin } from "rollup"

import builder from "core-js-builder"
import MagicString from "magic-string"

type CoreJSOptions = Parameters<typeof builder>[0]

export interface CoreJSPluginOptions {
	/** Browserslist or core-js-compat format, if not set then browserslist config is tried to load */
	targets?: CoreJSOptions["targets"]
	/** CoreJS modules to use, defaults to "core-js/es" */
	modules?: CoreJSOptions["modules"]
	/** CoreJS modules to exclude */
	exclude?: CoreJSOptions["exclude"]
	/** Add comment with used modules within bundle */
	summary?: {
		size: boolean
		modules: boolean
	}
}

export function corejsPlugin(
	options: CoreJSPluginOptions = { modules: "core-js/es" }
) {
	const config: CoreJSOptions = {
		format: "esm",
		modules: options.modules,
		exclude: options.exclude,
		targets: options.targets || browserslist.loadConfig({}),
		summary: {
			comment: options.summary,
		},
	}

	return {
		name: "core-js",
		async transform(code, id) {
			/*
			 * We do this in `transform` so the imports get grouped
			 * into split chunk for multiple entries
			 */
			if (this.getModuleInfo(id)?.isEntry) {
				const magicString = new MagicString(code)
				const bundle = await builder(config)

				magicString.prepend(bundle)

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
	} as Plugin
}
