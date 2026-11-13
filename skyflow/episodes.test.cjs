const assert = require('node:assert/strict');
const { Airport, getEpisode } = require('./simulation.js');
const { parse, VoiceSession } = require('./controls.js');
const data = [
  { id: 12, code: 'SF012', fuel: 74 },
  { id: 23, code: 'NV023', fuel: 38, risk: true },
  { id: 47, code: 'AK047', fuel: 57, kind: 'СРОЧНЫЙ' },
  { id: 61, code: 'SF061', fuel: 92, kind: 'ВЫЛЕТ' }
];
const results = [];
for (const episode of [2, 3]) {
  for (const reaction of [6, 10, 14]) {
    let lowest = 100, longest = 0;
    for (let seed = 0; seed < 100; seed++) {
      const airport = new Airport(data, { dynamic: true, episode, seed });
      let nextOrder = reaction;
      for (let second = 0; second < 700 && !airport.finished && !airport.failed; second++) {
        if (second >= nextOrder) {
          const available = airport.flights.filter(f => ['holding', 'ready'].includes(f.phase) && !f.checking)
            .sort((a, b) => (a.phase === 'ready' ? 999 : a.fuel) - (b.phase === 'ready' ? 999 : b.fuel));
          for (const flight of available) {
            if (flight.risk && !flight.checked) {
              if (airport.inspection) continue;
              assert.ok(airport.command(flight.id, 'Проверка').ok);
            } else {
              if (!airport.runways.some(r => !r.closed && !r.closing && r.owner === null && !(r.safeAt > airport.time))) continue;
              if (flight.phase !== 'ready' && !airport.gates.some(g => g.owner === null && (flight.threat ? g.id === 'ISO' : g.id !== 'ISO'))) continue;
              assert.ok(airport.command(flight.id, flight.phase === 'ready' ? 'Взлёт' : flight.threat ? 'Изолированная стоянка' : 'Посадка').ok);
              if (flight.phase === 'landing') lowest = Math.min(lowest, flight.fuel);
            }
            nextOrder = second + reaction;
            break;
          }
        }
        airport.tick(1);
        airport.drain();
      }
      const context = JSON.stringify({ episode, reaction, seed, losses: airport.losses, reputation: airport.reputation });
      assert.ok(airport.finished, context);
      assert.equal(airport.losses, 0, context);
      assert.equal(airport.reputation, 100, context);
      assert.equal(airport.target, episode === 2 ? 14 : 18);
      assert.ok(airport.story.some(line => line.includes('подтвердил срочный')));
      assert.ok(airport.story.some(line => line.includes('записан вчера')));
      longest = Math.max(longest, airport.time);
    }
    results.push({ episode, reaction, seeds: 100, minimumFuel: Math.floor(lowest), seconds: Math.ceil(longest) });
  }
}
const signal = new Airport(data, { episode: 2 });
assert.equal(signal.flights[1].reportedFuel, 78);
signal.command(23, 'Проверка');
signal.tick(13);
assert.equal(signal.flights[1].reportedFuel, null);
assert.equal(signal.flights[1].threat, false);
assert.ok(signal.flights[1].urgent);
const link = new Airport(data, { episode: 3 });
link.command(23, 'Проверка');
link.tick(10);
assert.equal(link.linkProgress, 0);
link.tick(4);
assert.ok(link.linkProgress > 0);
link.flights.forEach(f => { f.done = true; f.phase = 'transferred'; });
assert.equal(link.finished, false);
link.tick(180);
assert.equal(link.finished, true);
assert.equal(link.story.filter(line => line.includes('Канал восстановлен')).length, 1);
const abandoned = new Airport(data, { episode: 3 });
abandoned.tick(200);
assert.ok(abandoned.losses > 0);
assert.ok(abandoned.reputation < 100);
for (const [phrase, action] of [['эпизод два', 'episode-2'], ['третий эпизод', 'episode-3'], ['эпизод 1', 'episode-1'], ['следующий эпизод', 'next-episode']]) {
  assert.equal(parse(phrase).action, action);
  assert.equal(new VoiceSession().receive(phrase).command.action, action);
}
assert.equal(getEpisode(999).id, 1);
console.log('PASS: 600 full episode shifts, true/archived calls, repair interruptions, completion gate, failure and voice selection');
console.log(results);
