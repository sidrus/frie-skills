import { describe, expect, test } from 'claude-code/testing'
import { findBritishSpellings } from '../hooks/spelling'

describe('findBritishSpellings', () => {
  test('returns the word when Write content adds a British spelling', () => {
    expect(findBritishSpellings({ tool: 'Write', content: 'Its behaviour changed.' })).toEqual(['behaviour'])
  })

  test('returns nothing when the old text already had the word', () => {
    const edit = { tool: 'Edit', old_string: 'the colour', new_string: 'the Colour value' }

    expect(findBritishSpellings(edit)).toEqual([])
  })

  test('returns words from every edit when MultiEdit adds them', () => {
    const edit = { tool: 'MultiEdit', edits: [{ old_string: 'a', new_string: 'normalised' }, { old_string: 'b', new_string: 'cancelled' }] }

    expect(findBritishSpellings(edit)).toEqual(['normalised', 'cancelled'])
  })

  test('returns the word when a notebook cell adds it', () => {
    expect(findBritishSpellings({ tool: 'NotebookEdit', new_source: 'grey = 1' })).toEqual(['grey'])
  })

  test('returns each word once when it repeats in another case', () => {
    expect(findBritishSpellings({ tool: 'Write', content: 'Licence and licence' })).toEqual(['Licence'])
  })

  test('returns nothing when the words are American or merely similar', () => {
    const content = 'programmer programmed fulfill fulfilled modeled behavior realize'

    expect(findBritishSpellings({ tool: 'Write', content })).toEqual([])
  })

  test('returns the stem forms when the patterns end a word', () => {
    expect(findBritishSpellings({ tool: 'Write', content: 'a programme to fulfil' })).toEqual(['programme', 'fulfil'])
  })

  test('returns twelve words when an edit adds more', () => {
    const words = ['behaviour', 'honour', 'neighbour', 'labour', 'rumour', 'colour', 'favour', 'licence', 'centre', 'metre', 'defence', 'catalogue', 'grey']

    expect(findBritishSpellings({ tool: 'Write', content: words.join(' ') })).toEqual(words.slice(0, 12))
  })
})

describe('spelling reminder', () => {
  test('adds context when an edit adds a British spelling', async ($, on) => {
    on('tool.call', () => ({ result: 'ran' }) as never)

    const answer = await $.tool.call({ tool: 'Write', file_path: '/repo/notes.md', content: 'colour' } as never)

    expect(answer.context?.length).toBe(1)
  })

  test('adds no context when the edit is clean', async ($, on) => {
    on('tool.call', () => ({ result: 'ran' }) as never)

    const answer = await $.tool.call({ tool: 'Write', file_path: '/repo/notes.md', content: 'color' } as never)

    expect(answer.context).toBeUndefined()
  })

  test('adds no context when the edit failed', async ($, on) => {
    on('tool.call', () => ({ result: 'no match', isError: true }) as never)

    const answer = await $.tool.call({ tool: 'Edit', file_path: '/repo/notes.md', old_string: 'x', new_string: 'colour' } as never)

    expect(answer.context).toBeUndefined()
  })
})
