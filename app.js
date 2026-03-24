(function () {
  const levelDefinitions = window.THIEL_MEMORY_LEVELS || [];
  const levelGuides = window.THIEL_MEMORY_LEVELS || [];
  const levelPools = {
    level1: window.THIEL_MEMORY_TEXT_CARDS || window.THIEL_MEMORY_CARDS || [],
    level2: window.THIEL_MEMORY_INTERPRETATION_CARDS || []
  };
  const playerColors = ["Signalrot", "Nebelblau", "Waldgrün", "Messinggelb"];

  const elements = {
    levelSelect: document.getElementById("levelSelect"),
    playerCount: document.getElementById("playerCount"),
    pairCount: document.getElementById("pairCount"),
    categorySelect: document.getElementById("categorySelect"),
    startGameBtn: document.getElementById("startGameBtn"),
    previewBtn: document.getElementById("previewBtn"),
    setupHint: document.getElementById("setupHint"),
    scoreboard: document.getElementById("scoreboard"),
    pairsFoundStat: document.getElementById("pairsFoundStat"),
    attemptStat: document.getElementById("attemptStat"),
    accuracyStat: document.getElementById("accuracyStat"),
    statusBanner: document.getElementById("statusBanner"),
    deckMeta: document.getElementById("deckMeta"),
    board: document.getElementById("board"),
    matchDetail: document.getElementById("matchDetail"),
    historyList: document.getElementById("historyList"),
    sourceList: document.getElementById("sourceList"),
    zoomModal: document.getElementById("zoomModal"),
    zoomType: document.getElementById("zoomType"),
    zoomTitle: document.getElementById("zoomTitle"),
    zoomMeta: document.getElementById("zoomMeta"),
    zoomText: document.getElementById("zoomText"),
    zoomCloseBtn: document.getElementById("zoomCloseBtn")
  };

  const state = {
    players: [],
    deck: [],
    openIds: [],
    matchedPairIds: new Set(),
    currentPlayer: 0,
    attempts: 0,
    matches: 0,
    activePairs: 0,
    history: [],
    lastMatch: null,
    level: "level1",
    category: "Alle Themen",
    previewMode: false,
    lockBoard: false
  };

  function shuffle(list) {
    const copy = [...list];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function getLevelMeta(levelId) {
    return levelDefinitions.find((level) => level.id === levelId) || levelDefinitions[0] || { title: "Spiellevel" };
  }

  function getActivePool() {
    return levelPools[state.level] || [];
  }

  function getAvailableCards() {
    const pool = getActivePool();
    if (state.category === "Alle Themen") {
      return pool;
    }
    return pool.filter((card) => card.category === state.category);
  }

  function buildDeck(selection) {
    return shuffle(
      selection.flatMap((item) => [
        {
          uid: `${item.id}-question`,
          pairId: item.id,
          faceType: "question",
          label: "Frage",
          text: item.question,
          category: item.category,
          sourcePage: item.sourcePage,
          answerFragment: Boolean(item.answerFragment),
          answerContext: item.answerContext || ""
        },
        {
          uid: `${item.id}-answer`,
          pairId: item.id,
          faceType: "answer",
          label: state.level === "level2" ? "Antwort" : "Zitat",
          text: item.answer,
          category: item.category,
          sourcePage: item.sourcePage,
          answerFragment: Boolean(item.answerFragment),
          answerContext: item.answerContext || ""
        }
      ])
    );
  }

  function getCardByUid(uid) {
    return state.deck.find((card) => card.uid === uid);
  }

  function getPairMeta(pairId) {
    return getActivePool().find((card) => card.id === pairId) || null;
  }

  function populateLevelSelect() {
    elements.levelSelect.innerHTML = levelDefinitions
      .filter((level) => level.id !== "hint")
      .map((level) => `<option value="${escapeHtml(level.id)}">${escapeHtml(level.title)}</option>`)
      .join("");
  }

  function populateCategorySelect() {
    const categories = ["Alle Themen", ...new Set(getActivePool().map((card) => card.category))];
    elements.categorySelect.innerHTML = categories
      .map((category) => {
        const count = category === "Alle Themen"
          ? getActivePool().length
          : getActivePool().filter((card) => card.category === category).length;
        const value = category === "Alle Themen" ? "Alle Themen" : category;
        return `<option value="${escapeHtml(value)}">${escapeHtml(category)} (${count})</option>`;
      })
      .join("");
  }

  function renderSources() {
    elements.sourceList.innerHTML = levelGuides
      .map(
        (source) => `
          <article class="source-item">
            <h3>${escapeHtml(source.title)}</h3>
            <p>${escapeHtml(source.note)}</p>
          </article>
        `
      )
      .join("");
  }

  function createPlayers(count) {
    return Array.from({ length: count }, (_, index) => ({
      id: index,
      name: `Spieler ${index + 1}`,
      tone: playerColors[index],
      score: 0
    }));
  }

  function updateSetupHint(requestedPairs, actualPairs, availablePairs) {
    if (requestedPairs > availablePairs) {
      elements.setupHint.textContent =
        `Im gewählten Themenbereich stehen ${availablePairs} Paare zur Verfügung. Für diese Partie werden daher ${actualPairs} Paare verwendet.`;
      return;
    }
    elements.setupHint.textContent =
      `Aktuell stehen ${availablePairs} mögliche Paare im gewählten Deck bereit.`;
  }

  function startGame() {
    closeZoom();
    const selectedLevel = elements.levelSelect.value;
    const selectedCategory = elements.categorySelect.value;
    const playerCount = Number(elements.playerCount.value);
    const requestedPairs = Number(elements.pairCount.value);

    state.level = selectedLevel;
    state.category = selectedCategory;
    const availableCards = shuffle(getAvailableCards());
    const actualPairs = Math.min(requestedPairs, availableCards.length);
    const chosenPairs = availableCards.slice(0, actualPairs);

    state.players = createPlayers(playerCount);
    state.deck = buildDeck(chosenPairs);
    state.openIds = [];
    state.matchedPairIds = new Set();
    state.currentPlayer = 0;
    state.attempts = 0;
    state.matches = 0;
    state.activePairs = actualPairs;
    state.history = [];
    state.lastMatch = null;
    state.previewMode = false;
    state.lockBoard = false;

    updateSetupHint(requestedPairs, actualPairs, availableCards.length);
    render();
    setStatus(
      `Neue Partie gestartet: ${getLevelMeta(state.level).title}, ${actualPairs} Paare im Deck „${selectedCategory}“. ${state.players[0].name} beginnt.`
    );
  }

  function setStatus(message) {
    elements.statusBanner.textContent = message;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function nextPlayer() {
    if (state.players.length <= 1) {
      return;
    }
    state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
  }

  function isCardVisible(card) {
    return state.previewMode || state.openIds.includes(card.uid) || state.matchedPairIds.has(card.pairId);
  }

  function renderScoreboard() {
    elements.scoreboard.innerHTML = state.players
      .map(
        (player, index) => `
          <article class="score-chip ${index === state.currentPlayer ? "active" : ""}">
            <p class="mini-label">${escapeHtml(player.tone)}</p>
            <strong>${escapeHtml(player.name)}</strong>
            <span class="score-value">${player.score}</span>
          </article>
        `
      )
      .join("");
  }

  function renderStats() {
    elements.pairsFoundStat.textContent = `${state.matches} / ${state.activePairs}`;
    elements.attemptStat.textContent = String(state.attempts);
    const accuracy = state.attempts === 0 ? 0 : Math.round((state.matches / state.attempts) * 100);
    elements.accuracyStat.textContent = `${accuracy} %`;
    elements.deckMeta.textContent = state.activePairs
      ? `${state.deck.length} Karten im Raster, ${getLevelMeta(state.level).title}, Themenbereich: ${state.category}.`
      : "Noch keine Partie aktiv.";
  }

  function renderMatchDetail() {
    if (!state.lastMatch) {
      elements.matchDetail.className = "match-detail empty-detail";
      elements.matchDetail.textContent = "Noch kein Paar gefunden.";
      return;
    }

    const pageHint = state.level === "level2"
      ? "Interpretations- und Theoriekarte aus Level 2."
      : state.lastMatch.sourcePage
      ? `Primärquelle: automatisch zugeordnete Seite ${state.lastMatch.sourcePage}.`
      : "Primärquelle: für dieses Paar konnte automatisch keine eindeutige Seite ermittelt werden.";
    const contextBlock = state.lastMatch.answerFragment
      ? `
        <div class="detail-block detail-context">
          <p class="card-badge">Kontext zur Antwort</p>
          <strong>${escapeHtml(state.lastMatch.answerContext)}</strong>
        </div>
      `
      : "";

    elements.matchDetail.className = "match-detail";
    elements.matchDetail.innerHTML = `
      <div class="detail-block">
        <p class="card-badge">Frage</p>
        <strong>${escapeHtml(state.lastMatch.question)}</strong>
      </div>
      <div class="detail-block">
        <p class="card-badge">Zitat</p>
        <strong>${escapeHtml(state.lastMatch.answer)}</strong>
      </div>
      ${contextBlock}
      <p class="match-meta">
        Themenbereich: <strong>${escapeHtml(state.lastMatch.category)}</strong><br />
        ${escapeHtml(pageHint)}
      </p>
    `;
  }

  function renderHistory() {
    if (!state.history.length) {
      elements.historyList.innerHTML = `<p class="muted">Sobald Treffer gelingen, erscheinen sie hier.</p>`;
      return;
    }

    elements.historyList.innerHTML = state.history
      .slice(0, 6)
      .map(
        (item, index) => `
          <article class="history-item">
            <h3>#${index + 1} ${escapeHtml(item.category)}</h3>
            <p>${escapeHtml(item.question)}</p>
          </article>
        `
      )
      .join("");
  }

  function renderBoard() {
    if (!state.deck.length) {
      elements.board.className = "board empty-board";
      elements.board.textContent = "Die Partie ist noch nicht gestartet.";
      return;
    }

    elements.board.className = "board";
    elements.board.innerHTML = state.deck
      .map((card) => {
        const visible = isCardVisible(card);
        const matched = state.matchedPairIds.has(card.pairId);
        const classes = [
          "memory-card",
          visible ? card.faceType : "hidden",
          matched ? "matched" : ""
        ].filter(Boolean).join(" ");

        const disabled = state.lockBoard || matched || state.openIds.includes(card.uid) || state.previewMode;
        const pageLabel = state.level === "level2"
          ? "Level 2"
          : card.sourcePage ? `S. ${card.sourcePage}` : "ohne Seite";
        const contextHint = card.faceType === "answer" && card.answerFragment
          ? `<span class="fragment-pill">Kontext nötig</span>`
          : "";

        if (!visible) {
          return `
            <article class="${classes}">
              <button class="card-action" type="button" data-uid="${card.uid}" ${disabled ? "disabled" : ""} aria-label="Verdeckte Karte"></button>
              <div class="card-face">
                <div class="card-top">
                  <p class="card-badge">Bahnwärter Thiel</p>
                </div>
              </div>
            </article>
          `;
        }

        return `
          <article class="${classes}">
            <button class="card-action" type="button" data-uid="${card.uid}" ${disabled ? "disabled" : ""} aria-label="${escapeHtml(card.label)}"></button>
            <button class="zoom-btn" type="button" data-zoom-uid="${card.uid}" aria-label="Karte vergrößern">Lupe</button>
            <div class="card-face">
              <div class="card-top">
                <p class="card-badge">${escapeHtml(card.label)}</p>
              </div>
              <p class="card-text">${escapeHtml(card.text)}</p>
              <div class="card-bottom">
                <span>${escapeHtml(card.category)}</span>
                <span>${escapeHtml(pageLabel)}</span>
              </div>
              ${contextHint}
            </div>
          </article>
        `;
      })
      .join("");
  }

  function render() {
    renderScoreboard();
    renderStats();
    renderBoard();
    renderMatchDetail();
    renderHistory();
  }

  function registerMatch(pairId) {
    const match = getPairMeta(pairId);
    state.matchedPairIds.add(pairId);
    state.matches += 1;
    state.players[state.currentPlayer].score += 1;
    state.lastMatch = match;
    state.history.unshift(match);
    state.openIds = [];
    state.lockBoard = false;

    if (state.matches === state.activePairs) {
      render();
      const winners = [...state.players].sort((left, right) => right.score - left.score);
      const topScore = winners[0].score;
      const winnerNames = winners
        .filter((player) => player.score === topScore)
        .map((player) => player.name)
        .join(", ");

      setStatus(`Partie beendet. Gewonnen: ${winnerNames} mit ${topScore} Treffer(n).`);
      return;
    }

    setStatus(
      `${state.players[state.currentPlayer].name} findet ein Paar und bleibt am Zug.`
    );
    render();
  }

  function registerMiss() {
    state.openIds = [];
    state.lockBoard = false;
    nextPlayer();
    setStatus(`${state.players[state.currentPlayer].name} ist jetzt am Zug.`);
    render();
  }

  function handleCardClick(uid) {
    if (!state.deck.length || state.lockBoard || state.previewMode) {
      return;
    }

    const card = getCardByUid(uid);
    if (!card || state.openIds.includes(uid) || state.matchedPairIds.has(card.pairId)) {
      return;
    }

    state.openIds.push(uid);
    renderBoard();

    if (state.openIds.length < 2) {
      return;
    }

    const [firstId, secondId] = state.openIds;
    const firstCard = getCardByUid(firstId);
    const secondCard = getCardByUid(secondId);
    const isMatch = firstCard && secondCard && firstCard.pairId === secondCard.pairId;

    state.attempts += 1;
    state.lockBoard = true;
    renderStats();

    window.setTimeout(() => {
      if (isMatch) {
        registerMatch(firstCard.pairId);
        return;
      }
      registerMiss();
    }, 950);
  }

  function activatePreview() {
    if (!state.deck.length || state.lockBoard || state.previewMode) {
      return;
    }
    state.previewMode = true;
    setStatus("Lernblick aktiv: Alle Karten sind für 8 Sekunden sichtbar.");
    renderBoard();
    window.setTimeout(() => {
      state.previewMode = false;
      setStatus(`${state.players[state.currentPlayer].name} ist am Zug.`);
      renderBoard();
    }, 8000);
  }

  function openZoom(uid) {
    const card = getCardByUid(uid);
    if (!card || !isCardVisible(card)) {
      return;
    }

    const pageHint = state.level === "level2"
      ? "Interpretations- und Theoriekarte"
      : card.sourcePage ? `Primärquelle: Seite ${card.sourcePage}` : "Primärquelle: keine sichere Seitenzuordnung";
    elements.zoomType.textContent = card.label;
    elements.zoomTitle.textContent = card.category;
    elements.zoomMeta.textContent = `${card.category} · ${pageHint}${card.faceType === "answer" && card.answerFragment ? " · Kontext nötig" : ""}`;
    elements.zoomText.innerHTML = `
      <div class="zoom-main-text">${escapeHtml(card.text)}</div>
      ${card.faceType === "answer" && card.answerFragment ? `
        <div class="zoom-context">
          <p class="card-badge">Kontext zur Antwort</p>
          <p>${escapeHtml(card.answerContext)}</p>
        </div>
      ` : ""}
    `;
    elements.zoomModal.classList.remove("modal-hidden");
    elements.zoomModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeZoom() {
    elements.zoomModal.classList.add("modal-hidden");
    elements.zoomModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function attachEvents() {
    elements.startGameBtn.addEventListener("click", startGame);
    elements.previewBtn.addEventListener("click", activatePreview);
    elements.zoomCloseBtn.addEventListener("click", closeZoom);
    elements.levelSelect.addEventListener("change", () => {
      state.level = elements.levelSelect.value;
      state.category = "Alle Themen";
      populateCategorySelect();
      elements.categorySelect.value = "Alle Themen";
      const availablePairs = getAvailableCards().length;
      updateSetupHint(
        Number(elements.pairCount.value),
        Math.min(Number(elements.pairCount.value), availablePairs),
        availablePairs
      );
    });
    elements.categorySelect.addEventListener("change", () => {
      state.category = elements.categorySelect.value;
      const availablePairs = getAvailableCards().length;
      updateSetupHint(Number(elements.pairCount.value), Math.min(Number(elements.pairCount.value), availablePairs), availablePairs);
    });
    elements.pairCount.addEventListener("change", () => {
      const pool = getActivePool();
      const availablePairs = state.category === "Alle Themen"
        ? pool.length
        : pool.filter((card) => card.category === state.category).length;
      updateSetupHint(Number(elements.pairCount.value), Math.min(Number(elements.pairCount.value), availablePairs), availablePairs);
    });
    elements.board.addEventListener("click", (event) => {
      const zoomButton = event.target.closest("[data-zoom-uid]");
      if (zoomButton) {
        openZoom(zoomButton.getAttribute("data-zoom-uid"));
        return;
      }
      const button = event.target.closest("[data-uid]");
      if (!button) {
        return;
      }
      handleCardClick(button.getAttribute("data-uid"));
    });
    elements.zoomModal.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-zoom='true']")) {
        closeZoom();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && elements.zoomModal.getAttribute("aria-hidden") === "false") {
        closeZoom();
      }
    });
  }

  function init() {
    populateLevelSelect();
    state.level = elements.levelSelect.value || "level1";
    populateCategorySelect();
    renderSources();
    attachEvents();
    state.players = createPlayers(Number(elements.playerCount.value));
    render();
    updateSetupHint(Number(elements.pairCount.value), Number(elements.pairCount.value), getActivePool().length);
  }

  init();
})();
