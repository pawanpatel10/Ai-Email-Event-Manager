import * as chrono from 'chrono-node';

const text = `
Date : April 20, 2026
Time : 17 : 00
Location : MNNIT
`;

console.log('Original Parsing:', chrono.parseDate(text, new Date(), { forwardDate: true }));

const fixedText = text.replace(/(\d+)\s*:\s*(\d+)/g, "$1:$2");
console.log('Fixed text parsing:', chrono.parseDate(fixedText, new Date(), { forwardDate: true }));
