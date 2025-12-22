const tempo = 500000; // microseconds per quarter
const ppq = 220;

function ticksToSeconds(ticks, tempo, ppq) {
  return (ticks / ppq) * (tempo / 1000000);
}

console.log(`tempo=${tempo}µs/quarter (${60000000/tempo} BPM)`);
console.log(`ppq=${ppq}`);
console.log(`\nConversions:`);
console.log(`1508 ticks = ${ticksToSeconds(1508, tempo, ppq).toFixed(3)}s`);
console.log(`46 ticks = ${ticksToSeconds(46, tempo, ppq).toFixed(3)}s`);
console.log(`87 ticks = ${ticksToSeconds(87, tempo, ppq).toFixed(3)}s`);
