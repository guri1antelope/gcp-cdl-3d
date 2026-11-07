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
    quiz: document.getElementById("screen-quiz"),
    result: document.getElementById("screen-result"),
    mockResult: document.getElementById("screen-mock-result")
  };

  function showScreen(screenKey) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    if (screens[screenKey]) {
      screens[screenKey].classList.add("active");
    }

    if (screenKey === "home") {
      scene3d.setMode("home");
      updateHomeHUD();
    } else if (screenKey === "quiz") {
      scene3d.setMode("dash");
    } else {
      scene3d.setMode("title");
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
            <div style="font-weight: bold; font-size: 14px;">スロット ${i}: ${data.playerName}</div>
            <div style="font-size: 11px; color: var(--text-sub); margin-top: 2px;">
              Lv.${data.partner.level} ${pName} | ${title}
            </div>
            <div style="font-size: 10px; color: #86efac; margin-top: 2px;">
              解答数: ${data.stats.totalSolved}問 (弱点: ${data.weakQuestions.length}問)
            </div>
          </div>
          <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;">再開 ▶</button>
        `;
        card.onclick = () => {
          audio.playTap();
          storage.currentSlot = i;
          initHomeForActiveSlot();
        };
      } else {
        card.innerHTML = `
          <div>
            <div style="font-weight: bold; font-size: 14px; color: var(--text-sub);">スロット ${i}: [空きスロット]</div>
            <div style="font-size: 11px; color: var(--text-sub);">新しくはじめる</div>
          </div>
          <button class="btn" style="padding: 6px 12px; font-size: 12px;">作成 ＋</button>
        `;
        card.onclick = () => {
          audio.playTap();
          const name = prompt("あなたの名前を入力してください（8文字以内）:", "受験生") || "受験生";
          const partnerId = 1; // 柴犬スタート
          storage.createSlot(i, name, partnerId);
          initHomeForActiveSlot();
        };
      }
      listEl.appendChild(card);
    }
  }

  function initHomeForActiveSlot() {
    const data = storage.getActiveData();
    if (!data) return;

    // 3D相棒モデル更新
    scene3d.updateCharacterModel(data.partner.id, data.partner.stage);
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
      scene3d.updateCharacterModel(storage.getActiveData().partner.id, res.currentStage);
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
  // ① ステージ学習
  document.getElementById("btn-mode-stages").onclick = () => {
    audio.playTap();
    renderStageList();
    showScreen("stageSelect");
  };

  function renderStageList() {
    const grid = document.getElementById("stage-list-grid");
    grid.innerHTML = "";
    const activeData = storage.getActiveData();

    quiz.stages.forEach((stg) => {
      const isCleared = activeData.clearedStages.includes(stg.id);
      const card = document.createElement("div");
      card.className = `stage-card ${isCleared ? "cleared" : ""}`;
      card.innerHTML = `
        <div>
          <div style="font-size: 13px; font-weight: bold;">${stg.name}</div>
          <div style="font-size: 11px; color: var(--text-sub); margin-top: 2px;">
            ${stg.questions.length}問 収録 ${isCleared ? "✅ CLEAR" : ""}
          </div>
        </div>
        <button class="btn ${isCleared ? "btn-secondary" : ""}" style="padding: 6px 12px; font-size: 12px;">
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

  document.getElementById("btn-stage-back").onclick = () => {
    audio.playTap();
    showScreen("home");
  };

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

    // Header progress
    document.getElementById("quiz-progress-text").textContent = `問 ${quiz.currentIndex + 1} / ${quiz.currentQuestions.length}`;
    document.getElementById("quiz-scenario-tag").textContent = q.scenario_tag || "ビジネス課題";
    document.getElementById("quiz-question-text").textContent = q.question;

    // ブックマーク状態
    const activeData = storage.getActiveData();
    const isBookmarked = activeData.bookmarkedQuestions.includes(q.id);
    document.getElementById("btn-quiz-bookmark").textContent = isBookmarked ? "★ 復習中" : "☆ 復習";

    // Choices
    const choicesBox = document.getElementById("quiz-choices-container");
    choicesBox.innerHTML = "";
    document.getElementById("quiz-explanation-card").style.display = "none";

    q.choices.forEach((choice) => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.innerHTML = `<span class="choice-label">${choice.label}.</span> <span>${choice.text}</span>`;

      btn.onclick = () => handleChoiceSelect(choice.label, btn);
      choicesBox.appendChild(btn);
    });
  }

  // ブックマーク切替
  document.getElementById("btn-quiz-bookmark").onclick = () => {
    audio.playTap();
    const q = quiz.getCurrentQuestion();
    if (!q) return;
    const bookmarked = storage.toggleBookmark(q.id);
    document.getElementById("btn-quiz-bookmark").textContent = bookmarked ? "★ 復習中" : "☆ 復習";
  };

  function handleChoiceSelect(label, selectedBtn) {
    // ボタンの無効化
    const allBtns = document.querySelectorAll(".choice-btn");
    allBtns.forEach((b) => (b.disabled = true));

    const result = quiz.answerCurrent(label);
    storage.recordAnswer(result.qId, result.isCorrect);

    if (result.isCorrect) {
      audio.playCorrect();
      scene3d.jumpPlayer();
      selectedBtn.classList.add("correct");
    } else {
      audio.playIncorrect();
      selectedBtn.classList.add("incorrect");
      // 正解ボタンを緑にする
      allBtns.forEach((b) => {
        if (b.textContent.trim().startsWith(result.correctAnswer)) {
          b.classList.add("correct");
        }
      });
    }

    // あんちょこ＆解説表示
    document.getElementById("quiz-business-tip").textContent = result.businessTip;
    document.getElementById("quiz-explanation-text").textContent = result.explanation;
    document.getElementById("quiz-explanation-card").style.display = "flex";
  }

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
    if (quiz.currentMode === "stage" && res.rate >= 70) {
      const activeData = storage.getActiveData();
      if (!activeData.clearedStages.includes(quiz.currentStageId)) {
        activeData.clearedStages.push(quiz.currentStageId);
        storage.saveActiveData();
      }
    }

    document.getElementById("result-score-text").textContent = `${res.score} / ${res.total} (${res.rate}%)`;
    document.getElementById("result-exp-text").textContent = `+${expGain} EXP 獲得！`;

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
