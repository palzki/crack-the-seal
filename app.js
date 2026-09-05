const form = document.querySelector("#search-form");
const tilesInput = document.querySelector("#tiles");
const clearButton = document.querySelector("#clear-button");
const status = document.querySelector("#status");
const results = document.querySelector("#results");
const resultCount = document.querySelector("#result-count");

let words = [];

function letterCounts(value) {
  const counts = new Map();
  for (const letter of value.toLowerCase()) {
    counts.set(letter, (counts.get(letter) || 0) + 1);
  }
  return counts;
}

function cleanLetters(value) {
  return [...value.toLowerCase()].filter((character) => /[a-z]/.test(character));
}

function findMatches(input) {
  const requiredLetters = cleanLetters(input);
  const requiredCounts = letterCounts(requiredLetters.join(""));
  const requiredLength = requiredLetters.length;

  return words
    .map((word) => {
      const wordLetters = cleanLetters(word);
      const wordCounts = letterCounts(wordLetters.join(""));
      const containsTiles = [...requiredCounts].every(
        ([letter, count]) => (wordCounts.get(letter) || 0) >= count
      );

      return containsTiles ? { word, extraLetters: wordLetters.length - requiredLength } : null;
    })
    .filter(Boolean)
    .sort((first, second) => first.extraLetters - second.extraLetters || first.word.localeCompare(second.word));
}

function renderMatches(matches, input) {
  const bestMatches = matches.filter((match) => match.extraLetters === 0);
  const visibleMatches = (bestMatches.length ? bestMatches : matches).slice(0, 5);
  resultCount.textContent = visibleMatches.length ? `${visibleMatches.length} shown` : "";

  if (!visibleMatches.length) {
    results.innerHTML = `
      <div class="empty-state">
        <span class="empty-mark" aria-hidden="true">0</span>
        <p>No matches for <strong>${input.toUpperCase()}</strong>. Try a different set of tiles.</p>
      </div>`;
    return;
  }

  results.innerHTML = visibleMatches.map(({ word, extraLetters }, index) => `
    <button class="result-card" type="button" data-copy-word="${word.replaceAll('"', '&quot;')}" aria-label="Copy ${word}">
      <span class="result-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
      <span class="result-word">${word}</span>
      <span class="result-detail">${extraLetters ? `+${extraLetters} extra` : "Copy"}</span>
    </button>`).join("");
}

async function copyWord(word, resultButton) {
  try {
    await navigator.clipboard.writeText(word);
  } catch {
    const copyInput = document.createElement("textarea");
    copyInput.value = word;
    document.body.append(copyInput);
    copyInput.select();
    document.execCommand("copy");
    copyInput.remove();
  }

  resultButton.classList.add("is-copied");
  resultButton.querySelector(".result-detail").textContent = "Copied";
  status.textContent = `Copied ${word} to your clipboard.`;
  setTimeout(() => {
    resultButton.classList.remove("is-copied");
    resultButton.querySelector(".result-detail").textContent = "Copy";
  }, 1400);
}

function search(input) {
  const cleanInput = cleanLetters(input).join("");
  if (!cleanInput) {
    status.textContent = "Enter at least one letter to search.";
    resultCount.textContent = "";
    results.innerHTML = `
      <div class="empty-state">
        <span class="empty-mark" aria-hidden="true">?</span>
        <p>Type a few letters to reveal possible matches.</p>
      </div>`;
    return;
  }

  const matches = findMatches(cleanInput);
  status.textContent = `${matches.length} ${matches.length === 1 ? "match" : "matches"} found for ${cleanInput.toUpperCase()}.`;
  renderMatches(matches, cleanInput);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  search(tilesInput.value);
});

clearButton.addEventListener("click", () => {
  tilesInput.value = "";
  search("");
  tilesInput.focus();
});

tilesInput.addEventListener("input", () => search(tilesInput.value));

results.addEventListener("click", (event) => {
  const resultButton = event.target.closest("[data-copy-word]");
  if (resultButton) copyWord(resultButton.dataset.copyWord, resultButton);
});

fetch("words.txt")
  .then((response) => {
    if (!response.ok) throw new Error("Word list could not be loaded.");
    return response.text();
  })
  .then((text) => {
    words = text.split(/\r?\n/).map((word) => word.trim()).filter(Boolean);
    status.textContent = `${words.length} entries ready. Enter your tiles to begin.`;
  })
  .catch(() => {
    status.textContent = "The word list could not be loaded. Check that words.txt is published.";
  });
