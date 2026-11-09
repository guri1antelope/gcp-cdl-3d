/**
 * Main Application Controller for GCP CDL 3D
 */

document.addEventListener("DOMContentLoaded", async () => {
  const audio = new AudioManager();
  const storage = new StorageManager();
  const quiz = new QuizEngine();

  // 3D Canvas
  const container = document.getElementById("three-canvas-container");
  const scene3d = new Scene3DManager(container);

  // Audio unlock on user interaction
  document.addEventListener("click", () => audio.unlockAudio(), { once: true });
  document.addEventListener("touchstart", () => audio.unlockAudio(), { once: true });

  // Load questions
  await quiz.loadQuestions();

  // Screens
  const screens = {
    title: document.getElementById("screen-title"),
    home: document.getElementById("screen-home"),
    stageSelect: document.getElementById("screen-stage-select"),
    book: document.getElementById("screen-book"),
    quiz: document.getElementById("screen-quiz"),
    result: document.getElementById("screen-result"),
    mockResult: document.getElementById("screen-mock-result")
  };

  function showScreen(screenKey) {
    Object.values(screens).forEach((s) => {
      if (s) s.classList.remove("active");
    });
    if (screens[screenKey]) {
      screens[screenKey].classList.add("active");
    }

    try {
      if (screenKey === "home") {
        scene3d.switchMode("home");
        updateHomeHUD();
      } else if (screenKey === "quiz") {
        scene3d.switchMode("dash");
      } else {
        scene3d.switchMode("title");
      }
    } catch (e) {
      console.warn("Scene3D mode switch fallback:", e);
    }
  }

  // ================= 1. Title Screen & Slots =================
  function renderSlotList() {
    const listEl = document.getElementById("slot-list");
    listEl.innerHTML = "";

    for (let i = 1; i <= MAX_SLOTS; i++) {
      const data = storage.slots[i];
      const card = document.createElement("div");
      card.className = "slot-card";

      if (data) {
        const title = getBusinessTitle(data.partner.level);
        const pName = PARTNER_SPECIES[data.partner.id] || "相棒";
        card.innerHTML = `
          <div>
            <div style="font-weight: bold; font-size: 16px;">スロット ${i}: ${data.playerName}</div>
            <div style="font-size: 13px; color: var(--text-sub); margin-top: 2px;">
              Lv.${data.partner.level} ${pName} | ${title}
            </div>
            <div style="font-size: 12px; color: #86efac; margin-top: 2px;">
              解答数: ${data.stats.totalSolved}問 (弱点: ${data.weakQuestions.length}問)
            </div>
          </div>
          <button class="btn btn-secondary" style="padding: 8px 14px; font-size: 14px;">再開 ▶</button>
        `;
        card.onclick = async () => {
          audio.playTap();
          storage.currentSlot = i;
          await initHomeForActiveSlot();
        };
      } else {
        card.innerHTML = `
          <div>
            <div style="font-weight: bold; font-size: 16px; color: var(--text-sub);">スロット ${i}: [空きスロット]</div>
            <div style="font-size: 13px; color: var(--text-sub);">新しくはじめる</div>
          </div>
          <button class="btn" style="padding: 8px 14px; font-size: 14px;">作成 ＋</button>
        `;
        card.onclick = async () => {
          audio.playTap();
          let name = "受験生";
          try {
            const input = prompt("あなたの名前を入力してください（8文字以内）:", "受験生");
            if (input && input.trim()) {
              name = input.trim().slice(0, 8);
            }
          } catch (e) {}
          const partnerId = 1; // 柴犬スタート
          storage.createSlot(i, name, partnerId);
          await initHomeForActiveSlot();
        };
      }
      listEl.appendChild(card);
    }
  }

  async function initHomeForActiveSlot() {
    const data = storage.getActiveData();
    if (!data) return;

    try {
      await scene3d.loadPlayerCharacter(data.partner.id, data.partner.stage);
    } catch (e) {
      console.error("Failed to load character model:", e);
    }
    showScreen("home");
  }

  // ================= 2. Home Screen & HUD =================
  function updateHomeHUD() {
    const data = storage.getActiveData();
    if (!data) return;

    document.getElementById("home-user-name").textContent = data.playerName;
    document.getElementById("home-business-title").textContent = getBusinessTitle(data.partner.level);

    // 試験日カウントダウン
    const daysLeft = storage.getDaysUntilExam();
    document.getElementById("home-exam-countdown").textContent = `12/15まであと${daysLeft}日`;

    // 相棒情報
    const pName = PARTNER_SPECIES[data.partner.id] || "相棒";
    document.getElementById("home-partner-badge").textContent = `Lv.${data.partner.level} ${pName}`;

    // EXPバー
    const expPct = Math.min(100, Math.round((data.partner.exp / EXP_PER_LEVEL) * 100));
    document.getElementById("home-exp-bar").style.width = `${expPct}%`;
    document.getElementById("home-exp-text").textContent = `${data.partner.exp}/${EXP_PER_LEVEL} EXP`;

    // 弱点問題数バッジ
    document.getElementById("home-weak-count").textContent = `間違えた問題 (${data.weakQuestions.length}問)`;
  }

  // 相棒タッチでジャンプ
  const petZone = document.getElementById("home-pet-zone");
  petZone.addEventListener("click", () => {
    audio.playTap();
    scene3d.jumpPlayer();
  });

  // ごはん育成
  document.getElementById("btn-feed-apple").onclick = () => feedPartner(50, "🍎 リンゴを食べて嬉しそう！");
  document.getElementById("btn-feed-meat").onclick = () => feedPartner(120, "🍖 お肉をもりもり食べた！");

  function feedPartner(expGain, msg) {
    audio.playFeed();
    scene3d.jumpPlayer();
    const res = storage.addExp(expGain);
    document.getElementById("home-speech-bubble").textContent = msg;

    if (res.leveledUp) {
      audio.playLevelUp();
      alert(`🎉 レベルアップ！ Lv.${res.currentLevel} になりました！`);
    }
    if (res.evolved) {
      scene3d.loadPlayerCharacter(storage.getActiveData().partner.id, res.currentStage);
      alert(`✨ 相棒が進化しました！`);
    }
    updateHomeHUD();
  }

  document.getElementById("btn-back-to-title").onclick = () => {
    audio.playTap();
    renderSlotList();
    showScreen("title");
  };

  document.getElementById("btn-toggle-sound").onclick = () => {
    const muted = audio.toggleMute();
    document.getElementById("btn-toggle-sound").textContent = muted ? "🔇" : "🔊";
  };

  // ================= 3. Learning Modes =================
  // ① 基礎ステージ学習
  document.getElementById("btn-mode-stages").onclick = () => {
    audio.playTap();
    renderStageList();
    showScreen("stageSelect");
  };

  // 🔥 実践対策 厳選50問
  const btnModePractice = document.getElementById("btn-mode-practice");
  if (btnModePractice) {
    btnModePractice.onclick = () => {
      audio.playTap();
      renderPracticeStageList();
      showScreen("stageSelect");
    };
  }

  function renderStageList() {
    const titleEl = document.getElementById("stage-select-title");
    if (titleEl) titleEl.textContent = "🚀 基礎ステージ（全20ステージ）";

    const grid = document.getElementById("stage-list-grid");
    grid.innerHTML = "";
    const activeData = storage.getActiveData();

    quiz.stages.forEach((stg) => {
      const isCleared = activeData.clearedStages.includes(stg.id);
      const card = document.createElement("div");
      card.className = `stage-card ${isCleared ? "cleared" : ""}`;
      card.innerHTML = `
        <div>
          <div style="font-size: 15.5px; font-weight: bold;">${stg.name}</div>
          <div style="font-size: 13px; color: var(--text-sub); margin-top: 2px;">
            ${stg.questions.length}問 収録 ${isCleared ? "✅ CLEAR" : ""}
          </div>
        </div>
        <button class="btn ${isCleared ? "btn-secondary" : ""}" style="padding: 8px 14px; font-size: 14px;">
          ${isCleared ? "再挑戦" : "開始 ▶"}
        </button>
      `;
      card.onclick = () => {
        audio.playTap();
        quiz.startStage(stg.id);
        startQuizSession();
      };
      grid.appendChild(card);
    });
  }

  function renderPracticeStageList() {
    const titleEl = document.getElementById("stage-select-title");
    if (titleEl) titleEl.textContent = "🔥 実践対策 厳選50問（全5ステージ）";

    const grid = document.getElementById("stage-list-grid");
    grid.innerHTML = "";
    const activeData = storage.getActiveData();

    quiz.practiceStages.forEach((stg) => {
      const stageKey = `practice_${stg.id}`;
      const isCleared = activeData.clearedStages.includes(stageKey);
      const card = document.createElement("div");
      card.className = `stage-card ${isCleared ? "cleared" : ""}`;
      card.style.borderColor = isCleared ? "var(--gcp-green)" : "rgba(249, 115, 22, 0.6)";
      card.innerHTML = `
        <div>
          <div style="font-size: 15.5px; font-weight: bold; color: #fdba74;">${stg.name}</div>
          <div style="font-size: 13px; color: var(--text-sub); margin-top: 2px;">
            ${stg.questions.length}問 収録 ${isCleared ? "✅ CLEAR" : ""}
          </div>
        </div>
        <button class="btn ${isCleared ? "btn-secondary" : ""}" style="padding: 8px 14px; font-size: 14px; background: ${isCleared ? "" : "linear-gradient(135deg, #ea580c, #c2410c)"};">
          ${isCleared ? "再挑戦" : "開始 ▶"}
        </button>
      `;
      card.onclick = () => {
        audio.playTap();
        quiz.startPracticeStage(stg.id);
        startQuizSession();
      };
      grid.appendChild(card);
    });
  }

  document.getElementById("btn-stage-back").onclick = () => {
    audio.playTap();
    showScreen("home");
  };

  // 📚 CDL暗記ブック（全200問 / 実践50問 問題集＆解答解説）
  let bookCurrentTab = "base"; // "base" or "practice"

  const btnBookTabBase = document.getElementById("btn-book-tab-base");
  const btnBookTabPractice = document.getElementById("btn-book-tab-practice");

  if (btnBookTabBase && btnBookTabPractice) {
    btnBookTabBase.onclick = () => {
      audio.playTap();
      bookCurrentTab = "base";
      btnBookTabBase.style.background = "rgba(66, 133, 244, 0.35)";
      btnBookTabBase.style.borderColor = "var(--gcp-blue)";
      btnBookTabBase.style.color = "#fff";
      btnBookTabPractice.style.background = "";
      btnBookTabPractice.style.borderColor = "";
      btnBookTabPractice.style.color = "";
      document.getElementById("book-section-filter").parentElement.style.display = "flex";
      renderBookList();
    };

    btnBookTabPractice.onclick = () => {
      audio.playTap();
      bookCurrentTab = "practice";
      btnBookTabPractice.style.background = "rgba(249, 115, 22, 0.35)";
      btnBookTabPractice.style.borderColor = "#f97316";
      btnBookTabPractice.style.color = "#fdba74";
      btnBookTabBase.style.background = "";
      btnBookTabBase.style.borderColor = "";
      btnBookTabBase.style.color = "";
      document.getElementById("book-section-filter").parentElement.style.display = "none";
      renderBookList();
    };
  }

  document.getElementById("btn-mode-book").onclick = () => {
    audio.playTap();
    renderBookList();
    showScreen("book");
  };

  document.getElementById("btn-book-back").onclick = () => {
    audio.playTap();
    showScreen("home");
  };

  document.getElementById("book-section-filter").onchange = () => renderBookList();
  document.getElementById("book-search-input").oninput = () => renderBookList();

  function renderBookList() {
    const container = document.getElementById("book-list-container");
    container.innerHTML = "";

    const activeData = storage.getActiveData();
    const searchKeyword = (document.getElementById("book-search-input").value || "").trim().toLowerCase();
    const sourceQuestions = bookCurrentTab === "base" ? quiz.questions : quiz.practiceQuestions;

    let filtered = sourceQuestions.filter((q) => {
      const qId = q.id || q.q_num;
      if (bookCurrentTab === "base") {
        const secFilter = document.getElementById("book-section-filter").value;
        if (secFilter === "weak") {
          if (!activeData.weakQuestions.includes(qId)) return false;
        } else if (secFilter === "bookmark") {
          if (!activeData.bookmarkedQuestions.includes(qId)) return false;
        } else if (secFilter !== "all") {
          if (String(q.section_id) !== secFilter) return false;
        }
      } else {
        // practice
        if (searchKeyword && activeData.weakQuestions.includes(qId)) {
          // weak filter if needed
        }
      }

      if (searchKeyword) {
        const fullText = (q.question + " " + (q.scenario_tag || "") + " " + (q.business_tip || "") + " " + (q.explanation || "") + " " + q.choices.map((c) => c.text).join(" ")).toLowerCase();
        if (!fullText.includes(searchKeyword)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-sub); padding: 40px 10px;">該当する問題がありません</div>`;
      return;
    }

    filtered.forEach((q) => {
      const card = document.createElement("div");
      card.style.background = "var(--panel-bg)";
      card.style.border = "1px solid var(--panel-border)";
      card.style.borderRadius = "12px";
      card.style.padding = "14px";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.gap = "8px";

      const isBookmarked = activeData.bookmarkedQuestions.includes(q.id);
      const isWeak = activeData.weakQuestions.includes(q.id);

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; gap: 8px; align-items: center;">
            <span style="font-weight: bold; font-size: 15px; color: var(--gcp-blue);">問${q.id || q.q_num} (${q.code || ("Q" + (q.id || q.q_num))})</span>
            <span class="scenario-tag" style="font-size: 12px; padding: 2px 8px;">${q.scenario_tag || "実践対策"}</span>
            ${isWeak ? '<span style="font-size: 12px; background: rgba(234,67,53,0.25); color: #fca5a5; padding: 2px 8px; border-radius: 4px;">⚠️ 弱点</span>' : ''}
          </div>
          <button class="btn-book-bm btn btn-secondary" style="padding: 4px 10px; font-size: 13px;">
            ${isBookmarked ? "★ 復習中" : "☆ 復習"}
          </button>
        </div>
        <div style="font-size: 16.5px; line-height: 1.6; color: #f8fafc; font-weight: 500;">
          ${q.question}
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
          ${q.choices.map((c) => `<div style="font-size: 14.5px; line-height: 1.45; color: #e2e8f0; padding: 6px 10px; background: rgba(0,0,0,0.25); border-radius: 8px;"><strong style="color: var(--gcp-blue); font-size: 15px;">${c.label}.</strong> ${c.text}</div>`).join("")}
        </div>
        <button class="btn-toggle-answer btn btn-secondary" style="margin-top: 6px; font-size: 14px; padding: 8px; border-color: var(--gcp-yellow); color: #fef08a;">
          💡 答えとビジネスあんちょこを開く ▼
        </button>
        <div class="book-answer-content" style="display: none; flex-direction: column; gap: 10px; margin-top: 8px;">
          <div class="business-tip-box" style="white-space: pre-wrap; padding: 12px 14px;">
            <div class="tip-title" style="font-size: 13.5px;">💡 ビジネス即答あんちょこ</div>
            <div style="font-size: 15px; color: #fef08a; line-height: 1.5;">${q.business_tip || ""}</div>
          </div>
          <div style="font-size: 14.5px; color: #e2e8f0; line-height: 1.6; background: rgba(0,0,0,0.35); padding: 12px 14px; border-radius: 8px;">
            <strong style="color: #86efac; font-size: 15px;">正解: ${Array.isArray(q.answer) ? q.answer.join(", ") : q.answer}</strong><br>
            ${q.explanation}
          </div>
        </div>
      `;

      card.querySelector(".btn-book-bm").onclick = (e) => {
        e.stopPropagation();
        audio.playTap();
        const bm = storage.toggleBookmark(q.id);
        e.target.textContent = bm ? "★ 復習中" : "☆ 復習";
      };

      const toggleBtn = card.querySelector(".btn-toggle-answer");
      const answerContent = card.querySelector(".book-answer-content");
      toggleBtn.onclick = () => {
        audio.playTap();
        const isOpen = answerContent.style.display === "flex";
        answerContent.style.display = isOpen ? "none" : "flex";
        toggleBtn.textContent = isOpen ? "💡 答えとビジネスあんちょこを開く ▼" : "▲ 閉じる";
      };

      container.appendChild(card);
    });
  }

  // ② 課題フラッシュ（10問高速特訓）
  document.getElementById("btn-mode-flash").onclick = () => {
    audio.playTap();
    quiz.startFlashMode();
    startQuizSession();
  };

  // ③ 弱点リベンジ
  document.getElementById("btn-mode-weak").onclick = () => {
    audio.playTap();
    const data = storage.getActiveData();
    if (data.weakQuestions.length === 0) {
      alert("現在、弱点リストに登録された問題はありません！素晴らしい！");
      return;
    }
    quiz.startWeakPoints(data.weakQuestions);
    startQuizSession();
  };

  // ④ 本番模擬試験 (50問・90分)
  let mockInterval = null;
  document.getElementById("btn-mode-mock").onclick = () => {
    audio.playTap();
    if (!confirm("本番模擬試験（50問・制限時間90分）を開始しますか？")) return;
    quiz.startMockExam();
    startQuizSession(true);
  };

  // ================= 4. Quiz Session Controller =================
  function startQuizSession(isMock = false) {
    showScreen("quiz");
    const timerBadge = document.getElementById("quiz-timer-badge");

    if (isMock) {
      timerBadge.style.display = "block";
      if (mockInterval) clearInterval(mockInterval);
      mockInterval = setInterval(() => {
        quiz.mockRemainingSeconds--;
        const mins = Math.floor(quiz.mockRemainingSeconds / 60);
        const secs = quiz.mockRemainingSeconds % 60;
        timerBadge.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

        if (quiz.mockRemainingSeconds <= 0) {
          clearInterval(mockInterval);
          finishMockExam();
        }
      }, 1000);
    } else {
      timerBadge.style.display = "none";
      if (mockInterval) clearInterval(mockInterval);
    }

    renderCurrentQuestion();
  }

  function renderCurrentQuestion() {
    const q = quiz.getCurrentQuestion();
    if (!q) {
      finishQuizSession();
      return;
    }

    const qId = q.id || q.q_num;
    const isMulti = (q.multi_select && q.multi_select > 1) || (Array.isArray(q.answer) && q.answer.length > 1);
    const requiredCount = q.multi_select || (Array.isArray(q.answer) ? q.answer.length : 1);

    // Header progress
    document.getElementById("quiz-progress-text").textContent = `問 ${quiz.currentIndex + 1} / ${quiz.currentQuestions.length}`;
    document.getElementById("quiz-scenario-tag").textContent = isMulti ? `${q.scenario_tag || "ビジネス課題"} [${requiredCount}つ選択]` : (q.scenario_tag || "ビジネス課題");
    document.getElementById("quiz-question-text").textContent = q.question;

    // ブックマーク状態
    const activeData = storage.getActiveData();
    const isBookmarked = activeData.bookmarkedQuestions.includes(qId);
    document.getElementById("btn-quiz-bookmark").textContent = isBookmarked ? "★ 復習中" : "☆ 復習";

    // Choices
    const choicesBox = document.getElementById("quiz-choices-container");
    choicesBox.innerHTML = "";
    document.getElementById("quiz-explanation-card").style.display = "none";

    const multiSubmitBtn = document.getElementById("btn-quiz-multi-submit");
    if (multiSubmitBtn) {
      multiSubmitBtn.style.display = isMulti ? "block" : "none";
      multiSubmitBtn.disabled = true;
      multiSubmitBtn.textContent = `${requiredCount}つ選択してください (0/${requiredCount})`;
    }

    let selectedMultiLabels = [];

    q.choices.forEach((choice) => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";

      if (isMulti) {
        btn.innerHTML = `<span class="choice-check">☐</span> <span class="choice-label">${choice.label}.</span> <span>${choice.text}</span>`;
        btn.onclick = () => {
          audio.playTap();
          const idx = selectedMultiLabels.indexOf(choice.label);
          if (idx >= 0) {
            selectedMultiLabels.splice(idx, 1);
            btn.classList.remove("selected");
            const chk = btn.querySelector(".choice-check");
            if (chk) chk.textContent = "☐";
          } else {
            if (selectedMultiLabels.length < requiredCount) {
              selectedMultiLabels.push(choice.label);
              btn.classList.add("selected");
              const chk = btn.querySelector(".choice-check");
              if (chk) chk.textContent = "☑";
            } else {
              // 既に上限まで選んでいる場合は入れ替え
              const oldest = selectedMultiLabels.shift();
              choicesBox.querySelectorAll(".choice-btn").forEach((b) => {
                const l = b.querySelector(".choice-label");
                if (l && l.textContent.replace(".", "").trim() === oldest) {
                  b.classList.remove("selected");
                  const c = b.querySelector(".choice-check");
                  if (c) c.textContent = "☐";
                }
              });
              selectedMultiLabels.push(choice.label);
              btn.classList.add("selected");
              const chk = btn.querySelector(".choice-check");
              if (chk) chk.textContent = "☑";
            }
          }

          if (multiSubmitBtn) {
            if (selectedMultiLabels.length === requiredCount) {
              multiSubmitBtn.disabled = false;
              multiSubmitBtn.textContent = `選択した【${[...selectedMultiLabels].sort().join(", ")}】で回答を確定 ▶`;
            } else {
              multiSubmitBtn.disabled = true;
              multiSubmitBtn.textContent = `あと${requiredCount - selectedMultiLabels.length}つ選択してください (${selectedMultiLabels.length}/${requiredCount})`;
            }
          }
        };
      } else {
        btn.innerHTML = `<span class="choice-label">${choice.label}.</span> <span>${choice.text}</span>`;
        btn.onclick = () => submitQuizAnswer([choice.label]);
      }

      choicesBox.appendChild(btn);
    });

    if (isMulti && multiSubmitBtn) {
      multiSubmitBtn.onclick = () => {
        audio.playTap();
        multiSubmitBtn.style.display = "none";
        submitQuizAnswer(selectedMultiLabels);
      };
    }
  }

  // ブックマーク切替
  document.getElementById("btn-quiz-bookmark").onclick = () => {
    audio.playTap();
    const q = quiz.getCurrentQuestion();
    if (!q) return;
    const qId = q.id || q.q_num;
    const bookmarked = storage.toggleBookmark(qId);
    document.getElementById("btn-quiz-bookmark").textContent = bookmarked ? "★ 復習中" : "☆ 復習";
  };

  function submitQuizAnswer(selectedLabels) {
    const multiSubmitBtn = document.getElementById("btn-quiz-multi-submit");
    if (multiSubmitBtn) multiSubmitBtn.style.display = "none";

    const allBtns = document.querySelectorAll(".choice-btn");
    allBtns.forEach((b) => (b.disabled = true));

    const result = quiz.answerCurrent(selectedLabels);
    storage.recordAnswer(result.qId, result.isCorrect);

    const q = quiz.getCurrentQuestion();
    const correctList = quiz._normalizeAnswers(result.correctAnswer);
    const userList = quiz._normalizeAnswers(selectedLabels);

    // 全ボタンのスタイルとバッジ更新
    allBtns.forEach((b) => {
      const labelEl = b.querySelector(".choice-label");
      const bLabel = labelEl ? labelEl.textContent.replace(".", "").trim().toUpperCase() : "";

      const isUserChosen = userList.includes(bLabel);
      const isCorrectChoice = correctList.includes(bLabel);

      if (isUserChosen && isCorrectChoice) {
        b.classList.add("correct");
        b.insertAdjacentHTML("beforeend", `<span class="choice-tag tag-user-correct">⭕ あなたの回答（正解！）</span>`);
      } else if (isUserChosen && !isCorrectChoice) {
        b.classList.add("incorrect");
        b.insertAdjacentHTML("beforeend", `<span class="choice-tag tag-user-wrong">❌ あなたの回答</span>`);
      } else if (!isUserChosen && isCorrectChoice) {
        b.classList.add("correct");
        b.insertAdjacentHTML("beforeend", `<span class="choice-tag tag-answer">👑 正解！</span>`);
      } else {
        b.classList.add("dimmed");
      }
    });

    // 判定バナーの描画
    const banner = document.getElementById("quiz-judgement-banner");
    const correctStr = correctList.join(", ");
    const userStr = userList.join(", ");

    if (result.isCorrect) {
      audio.playCorrect();
      scene3d.jumpPlayer();
      banner.className = "judgement-banner banner-correct";
      banner.innerHTML = `<div>⭕ <strong>大正解！ 正解は【${correctStr}】です</strong></div>`;
    } else {
      audio.playIncorrect();
      banner.className = "judgement-banner banner-incorrect";
      banner.innerHTML = `<div>❌ <strong>不正解：あなたの回答【${userStr}】 ➔ 正解は【${correctStr}】</strong></div>`;
    }

    // あんちょこ＆解説表示
    document.getElementById("quiz-business-tip").textContent = result.businessTip || "要点を整理して定着させましょう。";
    document.getElementById("quiz-explanation-text").textContent = result.explanation;
    document.getElementById("quiz-explanation-card").style.display = "flex";
  }

  // クイズ中断ボタン
  document.getElementById("btn-quiz-exit").onclick = () => {
    audio.playTap();
    if (confirm("学習を中断してホームに戻りますか？")) {
      if (mockInterval) clearInterval(mockInterval);
      showScreen("home");
    }
  };

  // 答え・解説カンニング（学習用）
  document.getElementById("btn-quiz-peek").onclick = () => {
    audio.playTap();
    const q = quiz.getCurrentQuestion();
    if (!q) return;

    const multiSubmitBtn = document.getElementById("btn-quiz-multi-submit");
    if (multiSubmitBtn) multiSubmitBtn.style.display = "none";

    const correctList = quiz._normalizeAnswers(q.answer);
    const correctStr = correctList.join(", ");

    const allBtns = document.querySelectorAll(".choice-btn");
    allBtns.forEach((b) => {
      b.disabled = true;
      const labelEl = b.querySelector(".choice-label");
      const bLabel = labelEl ? labelEl.textContent.replace(".", "").trim().toUpperCase() : "";

      if (correctList.includes(bLabel)) {
        b.classList.add("correct");
        if (!b.querySelector(".choice-tag")) {
          b.insertAdjacentHTML("beforeend", `<span class="choice-tag tag-answer">👑 正解！</span>`);
        }
      } else {
        b.classList.add("dimmed");
      }
    });

    const banner = document.getElementById("quiz-judgement-banner");
    banner.className = "judgement-banner banner-correct";
    banner.innerHTML = `<div>💡 <strong>正解は【${correctStr}】です</strong></div>`;

    document.getElementById("quiz-business-tip").textContent = q.business_tip || "";
    document.getElementById("quiz-explanation-text").textContent = q.explanation;
    document.getElementById("quiz-explanation-card").style.display = "flex";
  };

  document.getElementById("btn-quiz-next").onclick = () => {
    audio.playTap();
    if (quiz.nextQuestion()) {
      renderCurrentQuestion();
    } else {
      if (quiz.currentMode === "mock") {
        if (mockInterval) clearInterval(mockInterval);
        finishMockExam();
      } else {
        finishQuizSession();
      }
    }
  };

  // ================= 5. Results =================
  function finishQuizSession() {
    audio.playStageClear();
    const res = quiz.getResult();

    // EXP付与 (正解数 × 10 EXP)
    const expGain = res.score * 10;
    const expRes = storage.addExp(expGain);

    // ステージクリア保存
    if (res.rate >= 70) {
      const activeData = storage.getActiveData();
      const stageKey = quiz.currentMode === "practice_stage" ? `practice_${quiz.currentStageId}` : quiz.currentStageId;
      if (!activeData.clearedStages.includes(stageKey)) {
        activeData.clearedStages.push(stageKey);
        storage.saveActiveData();
      }
    }

    document.getElementById("result-score-text").textContent = `${res.score} / ${res.total} (${res.rate}%)`;
    document.getElementById("result-exp-text").textContent = `+${expGain} EXP 獲得！`;

    // 見直しリストの生成
    const reviewBox = document.getElementById("result-review-container");
    if (reviewBox) {
      reviewBox.innerHTML = "";
      const allPool = [...quiz.questions, ...quiz.practiceQuestions];

      quiz.userAnswers.forEach((ans, idx) => {
        const q = allPool.find((x) => (x.id || x.q_num) === ans.qId);
        if (!q) return;

        const selStr = Array.isArray(ans.selected) ? ans.selected.sort().join(", ") : ans.selected;
        const corStr = Array.isArray(ans.correct) ? ans.correct.sort().join(", ") : ans.correct;

        const item = document.createElement("div");
        item.style.background = ans.isCorrect ? "rgba(52, 168, 83, 0.15)" : "rgba(234, 67, 53, 0.15)";
        item.style.border = "1px solid " + (ans.isCorrect ? "rgba(52, 168, 83, 0.4)" : "rgba(234, 67, 53, 0.4)");
        item.style.borderRadius = "8px";
        item.style.padding = "10px 12px";
        item.style.fontSize = "14px";

        item.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong>問${idx + 1} (${q.code || ("Q" + (q.id || q.q_num))})</strong>
            <span>${ans.isCorrect ? '<span style="color:#86efac;font-weight:bold;">⭕ 正解</span>' : `<span style="color:#fca5a5;font-weight:bold;">❌ 回答【${selStr}】➔ 正解【${corStr}】</span>`}</span>
          </div>
          <div style="font-size: 13px; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${q.question}
          </div>
        `;
        reviewBox.appendChild(item);
      });
    }

    if (expRes.leveledUp) {
      alert(`🎉 レベルアップ！ Lv.${expRes.currentLevel} になりました！`);
    }

    showScreen("result");
  }

  function finishMockExam() {
    audio.playStageClear();
    const res = quiz.getResult();
    const data = storage.getActiveData();

    // 模試履歴追加
    data.mockExamHistory.push({
      date: new Date().toISOString(),
      score: res.score,
      total: res.total,
      rate: res.rate
    });
    storage.saveActiveData();

    document.getElementById("mock-pass-badge").innerHTML = res.passed
      ? "<span style='color: #86efac;'>🎉 合格基準達成！（70%以上）</span>"
      : "<span style='color: #fca5a5;'>あと少し！弱点克服で再挑戦しよう！</span>";

    document.getElementById("mock-total-score").textContent = `${res.score} / ${res.total} 点 (${res.rate}%)`;

    // セクション別内訳
    const breakdownEl = document.getElementById("mock-sec-breakdown");
    breakdownEl.innerHTML = "";
    Object.values(res.secStats).forEach((st) => {
      const r = Math.round((st.correct / st.total) * 100);
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.innerHTML = `<span>${st.title}</span><span style="font-weight: bold; color: ${r >= 70 ? '#86efac' : '#fca5a5'}">${st.correct}/${st.total} (${r}%)</span>`;
      breakdownEl.appendChild(row);
    });

    showScreen("mockResult");
  }

  document.getElementById("btn-result-home").onclick = () => {
    audio.playTap();
    showScreen("home");
  };

  document.getElementById("btn-mock-home").onclick = () => {
    audio.playTap();
    showScreen("home");
  };

  // ================= 6. Sync Modal =================
  const syncModal = document.getElementById("modal-sync");
  document.getElementById("btn-open-sync").onclick = () => {
    audio.playTap();
    const code = storage.exportBackupCode();
    document.getElementById("sync-export-code").value = code;
    syncModal.style.display = "flex";
  };

  document.getElementById("btn-close-sync").onclick = () => {
    audio.playTap();
    syncModal.style.display = "none";
  };

  document.getElementById("btn-copy-sync-code").onclick = () => {
    const code = document.getElementById("sync-export-code").value;
    navigator.clipboard.writeText(code).then(() => {
      alert("引き継ぎコードをコピーしました！別の端末の復元欄に貼り付けてください。");
    });
  };

  document.getElementById("btn-apply-sync-code").onclick = () => {
    const code = document.getElementById("sync-import-code").value;
    if (!code.trim()) {
      alert("コードを入力してください");
      return;
    }
    const res = storage.importBackupCode(code);
    if (res.success) {
      alert("データを復元しました！");
      syncModal.style.display = "none";
      renderSlotList();
    } else {
      alert(`復元エラー: ${res.error}`);
    }
  };

  // Start app at title screen
  renderSlotList();
  showScreen("title");
});
