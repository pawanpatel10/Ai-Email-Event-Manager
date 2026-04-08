import * as chrono from 'chrono-node';

const text = `
Date : April 20, 2026
Time : 17 : 00
Location : MNNIT
`;

const fixedText = text.replace(/Time\s*:\s*(\d{1,2})\s*:\s*(\d{2})/gi, "Time: $1:$2");
console.log('Fixed text:', fixedText);
console.log('Fixed text parsing:', chrono.parseDate(fixedText, new Date(), { forwardDate: true }));
