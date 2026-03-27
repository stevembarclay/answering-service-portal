import fs from 'fs'
import path from 'path'

/**
 * Loads a prompt template file from the `prompts/` directory.
 * Returns null if the file does not exist — callers should fall back to a hardcoded default.
 */
export function loadPrompt(filename: string): string | null {
  try {
    const filePath = path.join(process.cwd(), 'prompts', filename)
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
}

/**
 * Replaces all `{{variableName}}` placeholders in a template string with the
 * corresponding values from the vars map. Unknown placeholders are replaced with
 * an empty string.
 */
export function interpolatePrompt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? '')
}
