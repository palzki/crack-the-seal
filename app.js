// Crack the Seal: the event master posts a name's letters in scrambled order
// (like I-K-A-A-O-U-N-Q-M-K-A-G-Y). The answer is the name that uses exactly those letters.

const tilesInput = document.querySelector("#tiles");
const clearButton = document.querySelector("#clear");
const source = document.querySelector("#source");
const read = document.querySelector("#read");
const readCount = document.querySelector("#read-count");
const readTiles = document.querySelector("#read-tiles");
const stage = document.querySelector("#stage");
const close = document.querySelector("#close");

const A = 97;
let entries = null; // [{ name, counts: Uint8Array(26), length, key }]
let byKey = new Map(); // sorted letters -> entries using exactly those letters
let loadFailed = false;
let copiedName = "";

function lettersOf(value) {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function countLetters(letters) {
  const counts = new Uint8Array(26);
  for (let index = 0; index < letters.length; index += 1) counts[letters.charCodeAt(index) - A] += 1;
  return counts;
}

function sortedKey(letters) {
  return [...letters].sort().join("");
}

function prepare(text) {
  const seen = new Set();
  const list = [];
  for (const raw of text.split(/\r?\n/)) {
    const name = raw.trim();
    const letters = lettersOf(name);
    // Skip blank lines, names whose original characters were lost ("??? Church"), and repeats.
    if (!letters || name.includes("??") || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    list.push({ name, counts: countLetters(letters), length: letters.length, key: sortedKey(letters) });
  }
  return list;
}

// Names that contain every letter, closest first. Extra letters are the ones the event master didn't give.
function closest(counts, length, exclude, limit) {
  const found = [];
  outer: for (const entry of entries) {
    if (entry.length < length || exclude.has(entry)) continue;
    for (let letter = 0; letter < 26; letter += 1) if (entry.counts[letter] < counts[letter]) continue outer;
    found.push(entry);
  }
  found.sort((left, right) => left.length - right.length || left.name.length - right.name.length || left.name.localeCompare(right.name));
  return { total: found.length, shown: found.slice(0, limit) };
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function note(text) {
  return element("p", "note", text);
}

async function copy(name) {
  try {
    await navigator.clipboard.writeText(name);
  } catch {
    const fallback = document.createElement("textarea");
    fallback.value = name;
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    document.body.append(fallback);
    fallback.select();
    document.execCommand("copy");
    fallback.remove();
  }
  copiedName = name;
  render();
  setTimeout(() => {
    if (copiedName === name) {
      copiedName = "";
      render();
    }
  }, 1400);
}

// Which letters of a name are extra (not given by the event master). Tags like "[Lv.69]" usually sit
// at the start and suffixes like "'s Letter" at the end, so try matching from both ends and keep the
// version where the extra letters form the fewest separate runs.
function extraMask(name, counts, fromEnd) {
  const remaining = Uint8Array.from(counts);
  const characters = [...name];
  const mask = new Array(characters.length).fill(false);
  const order = characters.map((_, index) => index);
  if (fromEnd) order.reverse();
  for (const index of order) {
    const code = characters[index].toLowerCase().charCodeAt(0) - A;
    if (code < 0 || code >= 26) continue;
    if (remaining[code] > 0) remaining[code] -= 1;
    else mask[index] = true;
  }
  return mask;
}

function runs(name, mask) {
  let count = 0;
  let previous = false;
  [...name].forEach((character, index) => {
    if (!/[a-z]/i.test(character)) return;
    if (mask[index] && !previous) count += 1;
    previous = mask[index];
  });
  return count;
}

function markedName(name, counts) {
  const forward = extraMask(name, counts, false);
  const backward = extraMask(name, counts, true);
  const mask = runs(name, backward) < runs(name, forward) ? backward : forward;
  const wrap = element("span", "marked");
  [...name].forEach((character, index) => {
    if (mask[index]) wrap.append(element("span", "extra", character));
    else if (/[a-z]/i.test(character) || character === " ") wrap.append(character);
    else wrap.append(element("span", "punct", character));
  });
  return wrap;
}

function renderRead(letters) {
  read.hidden = !letters;
  readTiles.replaceChildren(...[...letters].map((letter) => element("span", "tile", letter.toUpperCase())));
  readCount.textContent = `${letters.length} ${letters.length === 1 ? "letter" : "letters"}`;
}

function renderStage(letters, exact, near) {
  if (loadFailed) return stage.replaceChildren(note("The name list couldn’t be loaded. Reload the page to try again."));
  if (!entries) return stage.replaceChildren(note("Loading Seal Online names…"));
  if (!letters) return stage.replaceChildren(note("Paste the letters from the event master, like I-K-A-A-O-U-N-Q-M-K-A-G-Y. Dashes and spaces are fine."));
  if (!exact.length && !near.total) {
    return stage.replaceChildren(note(`No name contains all of these ${letters.length} letters. Check for a typo, or try fewer letters.`));
  }
  if (!exact.length) {
    return stage.replaceChildren(note(`No name uses exactly these ${letters.length} letters. The closest names are below — check that every letter was copied.`));
  }

  const solved = element("div", "solved");
  const multiple = exact.length > 1;
  for (const entry of exact) {
    const row = element("div", "solved-row");
    const name = element("button", `solved-name${entry.name.length > 16 ? " is-long" : ""}${multiple ? " is-multiple" : ""}`, entry.name);
    name.type = "button";
    name.setAttribute("aria-label", `Copy ${entry.name}`);
    name.addEventListener("click", () => copy(entry.name));
    row.append(name);
    if (multiple) {
      const button = element("button", "copy", copiedName === entry.name ? "Copied" : "Copy");
      button.type = "button";
      button.addEventListener("click", () => copy(entry.name));
      row.append(button);
    }
    solved.append(row);
  }
  solved.append(element("p", "why", multiple
    ? `${exact.length} names use exactly these ${letters.length} letters.`
    : `Uses exactly these ${letters.length} letters.`));
  if (!multiple) {
    const button = element("button", "copy", copiedName === exact[0].name ? "Copied" : "Copy answer");
    button.type = "button";
    button.addEventListener("click", () => copy(exact[0].name));
    solved.append(button);
  }
  stage.replaceChildren(solved);
}

function renderClose(letters, counts, exact, near) {
  if (!near.total) {
    close.hidden = true;
    close.replaceChildren();
    return;
  }
  const { total, shown } = near;
  close.hidden = false;
  const heading = element("h2", "", exact.length ? "Close matches" : "Closest names");
  heading.append(element("span", "close-count", String(total)));
  const list = element("ul", "close-list");
  for (const entry of shown) {
    const button = element("button", "close-name");
    button.type = "button";
    button.title = `Copy ${entry.name}`;
    button.append(markedName(entry.name, counts));
    const extra = entry.length - letters.length;
    button.append(element("span", "close-extra", copiedName === entry.name ? "copied" : `+${extra} extra`));
    button.addEventListener("click", () => copy(entry.name));
    const item = element("li");
    item.append(button);
    list.append(item);
  }
  const parts = [heading, list];
  if (total > shown.length) parts.push(element("p", "close-more", `And ${total - shown.length} more with extra letters.`));
  close.replaceChildren(...parts);
}

function render() {
  const letters = lettersOf(tilesInput.value);
  const counts = countLetters(letters);
  const exact = entries && letters ? byKey.get(sortedKey(letters)) ?? [] : [];
  clearButton.disabled = !tilesInput.value;
  renderRead(letters);
  const near = entries && letters ? closest(counts, letters.length, new Set(exact), exact.length ? 5 : 12) : { total: 0, shown: [] };
  renderStage(letters, exact, near);
  renderClose(letters, counts, exact, near);
}

document.querySelector("#form").addEventListener("submit", (event) => event.preventDefault());
tilesInput.addEventListener("input", () => {
  copiedName = "";
  render();
});
clearButton.addEventListener("click", () => {
  tilesInput.value = "";
  copiedName = "";
  render();
  tilesInput.focus();
});

render();

fetch("words.txt")
  .then((response) => {
    if (!response.ok) throw new Error(`words.txt returned ${response.status}`);
    return response.text();
  })
  .then((text) => {
    entries = prepare(text);
    byKey = new Map();
    for (const entry of entries) {
      const group = byKey.get(entry.key);
      if (group) group.push(entry);
      else byKey.set(entry.key, [entry]);
    }
    source.textContent = `Searching ${entries.length.toLocaleString("en-US")} Seal Online names`;
    render();
  })
  .catch(() => {
    loadFailed = true;
    source.textContent = "Name list unavailable";
    render();
  });
