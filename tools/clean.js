#!/usr/bin/env bun

/**
 * Cross-platform clean script for the Folio project using Bun Shell.
 * Usage:
 *   - Basic: bun tools/clean.js
 *   - With target directory: bun tools/clean.js target
 *   - With multiple directories: bun tools/clean.js dist node_modules .turbo
 *
 * This script cleans specified directories in the project root and in each
 * workspace package defined in pnpm-workspace.yaml or package.json.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cwd } from 'node:process'
import { $ } from 'bun'

// Default directories to clean if none specified
const DEFAULT_DIRS = [
	// Build outputs
	'dist',
	'build',
	'.next',
	'.output',
	// Dependencies
	'node_modules',
	// Turbo cache
	'.turbo',
	// TanStack cache
	'.tanstack',
	// TypeScript build info
	'*.tsbuildinfo',
	// Coverage reports
	'coverage',
	// Zip archives
	'*.zip',
	// Expo cache
	'.expo',
	// Cache directories
	'.cache',
]

// Get directories to clean from command line arguments
const args = Bun.argv.slice(2)
const dirsToClean = args.length > 0 ? args : DEFAULT_DIRS

const projectRoot = cwd()

/**
 * Parse YAML content simply (handles basic pnpm-workspace.yaml format)
 * @param {string} content - YAML content
 * @returns {string[]} Array of package patterns
 */
function parseWorkspaceYaml(content) {
	const patterns = []
	const lines = content.split('\n')
	let inPackages = false

	for (const line of lines) {
		const trimmed = line.trim()

		if (trimmed === 'packages:') {
			inPackages = true
			continue
		}

		if (inPackages) {
			// Stop if we hit another top-level key (doesn't start with space/dash)
			if (trimmed && !line.startsWith(' ') && !line.startsWith('-')) {
				break
			}

			// Parse list item
			if (trimmed.startsWith('-')) {
				const pattern = trimmed.slice(1).trim()
				if (pattern) {
					patterns.push(pattern)
				}
			}
		}
	}

	return patterns
}

/**
 * Retrieves the paths of all workspace packages.
 * Supports both pnpm-workspace.yaml and package.json workspaces.
 * @param {string} rootDir - The project root directory.
 * @returns {Promise<string[]>} A promise that resolves to an array of absolute paths to workspace packages.
 */
async function getWorkspacePackagePaths(rootDir) {
	try {
		let workspacePatterns = []

		// First, try pnpm-workspace.yaml
		const pnpmWorkspacePath = join(rootDir, 'pnpm-workspace.yaml')
		if (existsSync(pnpmWorkspacePath)) {
			const content = readFileSync(pnpmWorkspacePath, 'utf-8')
			workspacePatterns = parseWorkspaceYaml(content)
			console.log(
				`📦 Found pnpm workspace with patterns: [${workspacePatterns.join(', ')}]`
			)
		}

		// Fallback to package.json workspaces
		if (workspacePatterns.length === 0) {
			const packageJsonPath = join(rootDir, 'package.json')
			if (existsSync(packageJsonPath)) {
				const packageJson = await Bun.file(packageJsonPath).json()
				if (Array.isArray(packageJson.workspaces)) {
					workspacePatterns = packageJson.workspaces
				} else if (
					packageJson.workspaces &&
					Array.isArray(packageJson.workspaces.packages)
				) {
					workspacePatterns = packageJson.workspaces.packages
				}
			}
		}

		if (workspacePatterns.length === 0) {
			console.warn(
				'⚠️ Could not find workspace configuration. Only cleaning project root.'
			)
			return []
		}

		const collectedPaths = []
		for (const pattern of workspacePatterns) {
			const glob = new Bun.Glob(pattern)
			for await (const path of glob.scan({
				cwd: rootDir,
				absolute: true,
				onlyFiles: false,
				followSymlinks: false,
			})) {
				collectedPaths.push(path)
			}
		}

		// Deduplicate paths
		const packagePaths = [...new Set(collectedPaths)]
		return packagePaths
	} catch (error) {
		console.error(
			`❌ Error reading workspace configuration: ${error.message}`
		)
		console.warn('⚠️ Proceeding to clean only the project root.')
		return []
	}
}

/**
 * Cleans a specific directory or pattern within a given base path.
 * @param {string} basePath - The base path where the directory to clean is located.
 * @param {string} dirName - The name of the directory or pattern to clean (supports wildcards).
 */
async function cleanDirInPath(basePath, dirName) {
	// Check if the dirName contains wildcards
	if (dirName.includes('*') || dirName.includes('?')) {
		try {
			const glob = new Bun.Glob(dirName)
			let foundFiles = false

			for await (const path of glob.scan({
				cwd: basePath,
				absolute: true,
				onlyFiles: false,
				followSymlinks: false,
			})) {
				foundFiles = true
				try {
					await $`rm -rf ${path}`.quiet()
					console.log(`    ✅ Removed: ${path}`)
				} catch (removeError) {
					console.error(`    ❌ Error removing '${path}': ${removeError.message}`)
				}
			}

			if (!foundFiles) {
				// Silent skip for patterns with no matches
			}
		} catch (error) {
			console.error(
				`    ❌ Error processing pattern '${dirName}' in '${basePath}': ${error.message}`
			)
		}
	} else {
		const fullPath = join(basePath, dirName)
		if (existsSync(fullPath)) {
			try {
				await $`rm -rf ${fullPath}`.quiet()
				console.log(`    ✅ Removed: ${fullPath}`)
			} catch (error) {
				console.error(
					`    ❌ Error removing '${dirName}' in '${basePath}': ${error.message}`
				)
			}
		}
	}
}

/**
 * Main function to orchestrate the cleaning process.
 */
async function main() {
	console.log('🧹 Starting clean process...')
	console.log(`📋 Targets: [${dirsToClean.join(', ')}]\n`)

	const workspacePaths = await getWorkspacePackagePaths(projectRoot)
	const allPathsToScan = [projectRoot, ...workspacePaths]

	let totalRemoved = 0

	for (const basePath of allPathsToScan) {
		const relativePath =
			basePath === projectRoot ? '.' : basePath.replace(projectRoot + '/', '')
		console.log(`\n📁 Cleaning: ${relativePath}`)

		for (const dir of dirsToClean) {
			await cleanDirInPath(basePath, dir)
		}
	}

	console.log('\n🎉 Clean completed!')
}

// Run the cleaner
main().catch((error) => {
	console.error('An unexpected error occurred during the clean process:', error)
	process.exit(1)
})
