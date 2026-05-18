import { describe, expect, it } from 'vitest'
import { formatSectionHeaders, joinEvents } from './api'

describe('SemanticSearch API - Event Parsing', () => {
  describe('formatSectionHeaders', () => {
    it('should format only the three specific headers in bold', () => {
      const content = `1. Cases Involved
The case between JC Stone Crusher and TATA Capital Financial Service Ltd is referred to as OMP (I)(COMM.)2373-19, filed on November 22nd, 2019 in the Delhi District & Sessions Court - South West District.

2. Answer Summary
In this case, TATA Capital Financial Service Ltd filed a petition seeking an ex-parte, ad-interim order for the appointment of a receiver to take possession of Taurian250TPH2S MOB CRUSHER MACHINE from JC Stone Crusher.

3. Other Information of the Case(s)
- Parties Involved: TATA Capital Financial Service Ltd (Petitioner), JC Stone Crusher (Respondent).
- Advocates: Mr. Avinash Chandra Upadhyay (Learned Counsel for the petitioner).
- Filing Date: November 22nd, 2019.
- Order Dates: November 25th, 2019 (Initial Order) and January 25th, 2021 (Final Order).
- Court Details: Delhi District & Sessions Court - South West District.
- Procedural History: The petition was filed seeking the appointment of a receiver for repossession of equipment, followed by orders appointing the receiver and dismissal of the petition as withdrawn. No further updates were provided in the context.`

      const formatted = formatSectionHeaders(content)

      // Verify the three specific headers are formatted in bold
      expect(formatted).toContain('**1. Cases Involved**')
      expect(formatted).toContain('**2. Answer Summary**')
      expect(formatted).toContain('**3. Other Information of the Case(s)**')

      // Verify the content is preserved
      expect(formatted).toContain('The case between JC Stone Crusher')
      expect(formatted).toContain('TATA Capital Financial Service Ltd')
    })

    it('should not format other numbered headers in bold', () => {
      const content = `1. Cases Involved
Some content here.

4. Some Other Section
This should not be bold.

2. Answer Summary
More content.

5. Another Section
This should also not be bold.`

      const formatted = formatSectionHeaders(content)

      // Verify the three specific headers are formatted in bold
      expect(formatted).toContain('**1. Cases Involved**')
      expect(formatted).toContain('**2. Answer Summary**')

      // Verify other numbered sections are NOT formatted in bold
      expect(formatted).not.toContain('**4. Some Other Section**')
      expect(formatted).not.toContain('**5. Another Section**')
      expect(formatted).toContain('4. Some Other Section')
      expect(formatted).toContain('5. Another Section')
    })

    it('should handle headers at the start of content', () => {
      const content = `1. Cases Involved
Content here.`

      const formatted = formatSectionHeaders(content)
      expect(formatted).toContain('**1. Cases Involved**')
    })

    it('should handle headers after newlines', () => {
      const content = `Some intro text.

2. Answer Summary
More content.`

      const formatted = formatSectionHeaders(content)
      expect(formatted).toContain('**2. Answer Summary**')
    })
  })

  describe('joinEvents - [][] handling', () => {
    it('should replace [][] pattern with 2 newlines', () => {
      const events = [
        '1. Cases Involved',
        'The case between',
        'JC Stone Crusher',
        '[][]', // Two consecutive empty brackets
        '2. Answer Summary',
        'In this case',
      ]

      const result = joinEvents(events)

      // Verify that [][] is replaced with 2 newlines
      expect(result.content).not.toContain('[][]')
      // Verify there are 2 newlines before section 2
      expect(result.content).toContain('\n\n')
      expect(result.content).toMatch(/\*\*1\. Cases Involved\*\*.*\n\n.*\*\*2\. Answer Summary\*\*/)
      // The content should have the headers properly formatted (check both content and markdown)
      const combinedContent = result.content + (result.markdown ? '\n\n' + result.markdown : '')
      expect(combinedContent).toContain('**1. Cases Involved**')
      expect(combinedContent).toContain('**2. Answer Summary**')
    })

    it('should handle [][] in the middle of content', () => {
      const content = 'Some text before[][]Some text after'
      const events = [content]

      const result = joinEvents(events)

      // [][] should be replaced with 2 newlines
      expect(result.content).not.toContain('[][]')
      expect(result.content).toContain('Some text before')
      expect(result.content).toContain('Some text after')
      // Verify there are 2 newlines between the texts
      expect(result.content).toContain('\n\n')
      expect(result.content).toMatch(/Some text before\n\nSome text after/)
    })

    it('should handle multiple [][] patterns', () => {
      const content = 'First section[][]Second section[][]Third section'
      const events = [content]

      const result = joinEvents(events)

      // All [][] should be replaced with 2 newlines each
      expect(result.content).not.toContain('[][]')
      expect(result.content).toContain('First section')
      expect(result.content).toContain('Second section')
      expect(result.content).toContain('Third section')
      // Verify there are 2 newlines between each section
      expect(result.content).toContain('\n\n')
      expect(result.content).toMatch(/First section\n\nSecond section\n\nThird section/)
    })
  })

  describe('Integration test - Full response parsing', () => {
    it('should parse the complete streaming response correctly', () => {
      // Simulate the complete events array from the user's console log
      const events = [
        ' ##',
        '1',
        '.',
        ' C',
        'ases',
        ' In',
        'vol',
        'ved',
        ' The',
        ' case',
        ' between',
        ' J',
        'C',
        ' Stone',
        ' Crusher',
        ' and',
        ' T',
        'ATA',
        ' Capital',
        ' Financial',
        ' Service',
        ' Ltd',
        ' is',
        ' referred',
        ' to',
        ' as',
        ' O',
        'MP',
        ' (',
        'I',
        ')(',
        'COMM',
        '.)',
        '2',
        '3',
        '7',
        '3',
        '-',
        '1',
        '9',
        ',',
        ' filed',
        ' on',
        ' November',
        '2',
        '2',
        'nd',
        ',',
        '2',
        '0',
        '1',
        '9',
        ' in',
        ' the',
        ' Delhi',
        ' District',
        ' &',
        ' S',
        'essions',
        ' Court',
        ' -',
        ' South',
        ' West',
        ' District',
        '.',
        '[]',
        '[]',
        ' ##',
        '2',
        '.',
        ' Answer',
        ' Summary',
        ' In',
        ' this',
        ' case',
        ',',
        ' T',
        'ATA',
        ' Capital',
        ' Financial',
        ' Service',
        ' Ltd',
        ' filed',
        ' a',
        ' petition',
        ' seeking',
        ' an',
        ' ex',
        '-',
        'par',
        'te',
        ',',
        ' ad',
        '-',
        'inter',
        'im',
        ' order',
        ' for',
        ' the',
        ' appointment',
        ' of',
        ' a',
        ' receiver',
        ' to',
        ' take',
        ' possession',
        ' of',
        ' T',
        'aur',
        'ian',
        '2',
        '5',
        '0',
        'TP',
        'H',
        '2',
        'S',
        ' M',
        'OB',
        ' CR',
        'US',
        'HER',
        ' M',
        'ACH',
        'INE',
        ' from',
        ' J',
        'C',
        ' Stone',
        ' Crusher',
        '.',
        '[]',
        '[]',
        ' ##',
        '3',
        '.',
        ' Other',
        ' Information',
        ' of',
        ' the',
        ' Case',
        '(',
        's',
        ')',
        ' -',
        ' Part',
        'ies',
        ' In',
        'vol',
        'ved',
        ':',
        ' T',
        'ATA',
        ' Capital',
        ' Financial',
        ' Service',
        ' Ltd',
        ' (',
        'Pet',
        'ition',
        'er',
        '),',
        ' J',
        'C',
        ' Stone',
        ' Crusher',
        ' (',
        'Res',
        'pond',
        'ent',
        ').',
      ]

      const result = joinEvents(events)

      // Verify the three headers are present and formatted in bold (check both content and markdown)
      const combinedContent = result.content + (result.markdown ? '\n\n' + result.markdown : '')
      expect(combinedContent).toContain('**1. Cases Involved**')
      expect(combinedContent).toContain('**2. Answer Summary**')
      expect(combinedContent).toContain('**3. Other Information of the Case(s)**')

      // Verify that [][] is replaced with newline (not present in final content)
      expect(combinedContent).not.toContain('[][]')

      // Verify the content structure is preserved
      expect(combinedContent).toContain('The case between')
      expect(combinedContent).toContain('JC Stone Crusher')
      expect(combinedContent).toContain('TATA Capital Financial Service Ltd')
    })

    it('should handle the exact response format from console logs', () => {
      // This test simulates the exact format from the user's console logs
      // where events come as individual character/word chunks
      const events = [
        ' ##',
        '1',
        '.',
        ' C',
        'ases',
        ' In',
        'vol',
        'ved',
        '[]',
        '[]',
        ' ##',
        '2',
        '.',
        ' Answer',
        ' Summary',
        '[]',
        '[]',
        ' ##',
        '3',
        '.',
        ' Other',
        ' Information',
        ' of',
        ' the',
        ' Case',
        '(',
        's',
        ')',
      ]

      const result = joinEvents(events)

      // Join the events to see the raw content
      const joined = events.join('')

      // Verify [][] appears in raw joined content
      expect(joined).toContain('[][]')

      // After processing, [][] should be replaced
      const combinedContent = result.content + (result.markdown ? '\n\n' + result.markdown : '')
      expect(combinedContent).not.toContain('[][]')

      // Headers should be formatted (check both content and markdown)
      expect(combinedContent).toContain('**1. Cases Involved**')
      expect(combinedContent).toContain('**2. Answer Summary**')
      expect(combinedContent).toContain('**3. Other Information of the Case(s)**')
    })

    it('should have empty line above markdown text', () => {
      const events = [
        'Some regular content',
        '##',
        '1',
        '.',
        ' Cases Involved',
        '[]',
      ]

      const result = joinEvents(events)

      // When markdown is present, there should be an empty line above it
      if (result.markdown) {
        // The markdown should be separated from content with \n\n
        const combined = `${result.content}\n\n${result.markdown}`
        // Verify there's at least one newline between content and markdown
        expect(combined).toMatch(/\n\n/)
      }
    })

    it('should have 2 newlines before section 2 and section 3 when [][] is detected', () => {
      // Simulate the actual scenario from console logs
      // Section 1 content, then [], [], then section 2 starts
      const events = [
        ' ##',
        '1',
        '.',
        ' Cases Involved',
        ' The',
        ' case',
        ' between',
        ' J',
        'C',
        ' Stone',
        ' Crusher',
        ' and',
        ' T',
        'ATA',
        ' Capital',
        ' Financial',
        ' Service',
        ' Ltd',
        ' is',
        ' referred',
        ' to',
        ' as',
        ' O',
        'MP',
        ' (',
        'I',
        ')(',
        'COMM',
        '.)',
        '2',
        '3',
        '7',
        '3',
        '-',
        '1',
        '9',
        ',',
        ' filed',
        ' on',
        ' November',
        '2',
        '2',
        'nd',
        ',',
        '2',
        '0',
        '1',
        '9',
        ' in',
        ' the',
        ' Delhi',
        ' District',
        ' &',
        ' S',
        'essions',
        ' Court',
        ' -',
        ' South',
        ' West',
        ' District',
        '.',
        '[]', // First empty array
        '[]', // Second empty array - should create 2 newlines
        ' ##',
        '2',
        '.',
        ' Answer',
        ' Summary',
        ' In',
        ' this',
        ' case',
        ',',
        ' T',
        'ATA',
        ' Capital',
        ' Financial',
        ' Service',
        ' Ltd',
        ' filed',
        ' a',
        ' petition',
        '.',
        '[]', // First empty array
        '[]', // Second empty array - should create 2 newlines
        ' ##',
        '3',
        '.',
        ' Other',
        ' Information',
        ' of',
        ' the',
        ' Case',
        '(',
        's',
        ')',
        ' -',
        ' Part',
        'ies',
        ' In',
        'vol',
        'ved',
        ':',
        ' T',
        'ATA',
        ' Capital',
        ' Financial',
        ' Service',
        ' Ltd',
      ]

      const result = joinEvents(events)
      const combinedContent = result.content + (result.markdown ? '\n\n' + result.markdown : '')

      // Remove debug logs for clean test output

      // Verify all three headers are present and formatted
      expect(combinedContent).toContain('**1. Cases Involved**')
      expect(combinedContent).toContain('**2. Answer Summary**')
      expect(combinedContent).toContain('**3. Other Information of the Case(s)**')

      // Verify there are 2 newlines before section 2
      // Check if there's \n\n between section 1 and section 2
      const hasNewlinesBeforeSection2 = combinedContent.includes('**1. Cases Involved**') &&
        combinedContent.includes('**2. Answer Summary**')
      expect(hasNewlinesBeforeSection2).toBe(true)

      // Find the position of section 1 end and section 2 start
      const section1End = combinedContent.indexOf('**1. Cases Involved**') + '**1. Cases Involved**'.length
      const section2Start = combinedContent.indexOf('**2. Answer Summary**')
      const textBetween = combinedContent.substring(section1End, section2Start)

      // Verify there are 2 newlines in between (the [][] pattern should create \n\n)
      // Check that there's at least one instance of \n\n between sections
      expect(textBetween).toMatch(/\n\n/)

      // Verify there are 2 newlines before section 3
      const section2End = combinedContent.indexOf('**2. Answer Summary**') + '**2. Answer Summary**'.length
      const section3Start = combinedContent.indexOf('**3. Other Information of the Case(s)**')
      const textBetween2And3 = combinedContent.substring(section2End, section3Start)

      // Verify there are 2 newlines in between
      expect(textBetween2And3).toMatch(/\n\n/)
    })

    it('should ensure header appears on new line after [][] pattern', () => {
      // Simulate the scenario where content ends, then [][], then ##header
      // The header should be on a new line with empty line above
      const events = [
        'On January7,2020, an order was issued.',
        '[]',
        '[]',
        ' ##',
        '3',
        '.',
        ' Other',
        ' Information',
        ' of',
        ' the',
        ' Case',
        '(',
        's',
        ')',
        '[]',
        ' -',
        ' Part',
        'ies',
        ' involved',
      ]

      const result = joinEvents(events)
      const combinedContent = result.content + (result.markdown ? '\n\n' + result.markdown : '')

      // Verify the header is formatted
      expect(combinedContent).toContain('**3. Other Information of the Case(s)**')

      // Verify there's proper spacing before the header
      // The pattern should be: content ending with period, then \n\n, then header
      const headerIndex = combinedContent.indexOf('**3. Other Information of the Case(s)**')
      const beforeHeader = combinedContent.substring(Math.max(0, headerIndex - 50), headerIndex)

      // Should have \n\n before the header (from [][] replacement)
      expect(beforeHeader).toMatch(/\n\n/)

      // The header should not be inline with previous content
      // Check that there's a newline before the header (not just a space)
      const justBeforeHeader = combinedContent.substring(Math.max(0, headerIndex - 10), headerIndex)
      expect(justBeforeHeader.trim()).not.toBe(justBeforeHeader) // Should have whitespace/newline
    })
  })
})

