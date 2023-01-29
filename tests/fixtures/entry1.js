/*
 * SPDX-FileCopyrightText: 2023 Ferdinand Thiessen <rpm@fthiessen.de>
 *
 * SPDX-License-Identifier: CC0-1.0
 */

export function arrayIncludes(a, b) {
    return Array.isArray(a) && a.includes(b)
}
