/**
 * Quiz Engine for GCP CDL 3D
 * Handles question loading, section stages (10 questions per stage),
 * flashcards, weak-point practice, and mock exam (50 questions / 90 min timer).
 */

class QuizEngine {
  constructor() {
    this.questions = [];
    this.sections = [];
    this.stages = []; // [{id, sectionId, stageNum, title, qIds}]
    this.practiceQuestions = [];
    this.practiceStages = [];
    this.currentMode = null; // 'stage', 'practice_stage', 'weak', 'mock', 'flash'
    this.currentQuestions = [];
    this.currentIndex = 0;
    this.correctCount = 0;
    this.userAnswers = []; // [{qId, selected, isCorrect, timeSpent}]

    // 模擬試験用タイマー
    this.mockTimer = null;
    this.mockRemainingSeconds = 90 * 60; // 90分
  }

  async loadQuestions() {
    try {
      const res = await fetch("data/cdl_questions.json");
      this.questions = await res.json();
      this.buildStages();

      // 実践50問も合わせてロード（存在すれば）
      await this.loadPracticeQuestions();

      return true;
    } catch (e) {
      console.error("Failed to load questions:", e);
      return false;
    }
  }

  async loadPracticeQuestions() {
    try {
      const res = await fetch("data/exam_practice_50.json");
      if (res.ok) {
        this.practiceQuestions = await res.json();
        this.buildPracticeStages();
      }
    } catch (e) {
      console.log("Practice questions not yet available:", e);
    }
  }

  buildPracticeStages() {
    this.practiceStages = [];
    const pageSize = 10;
    const total = this.practiceQuestions.length;
    const stageCount = Math.ceil(total / pageSize);

    for (let i = 0; i < stageCount; i++) {
      const slice = this.practiceQuestions.slice(i * pageSize, (i + 1) * pageSize);
      this.practiceStages.push({
        id: i + 1,
        title: `実践対策 ステージ ${i + 1}`,
        stageNum: i + 1,
        stageCount: stageCount,
        name: `実践対策 厳選50問 - ステージ ${i + 1}`,
        questionIds: slice.map((q) => q.id || q.q_num),
        questions: slice
      });
    }
  }

  buildStages() {
    // セクションごとにグルーピング
    const secMap = new Map();
    this.questions.forEach((q) => {
      if (!secMap.has(q.section_id)) {
        secMap.set(q.section_id, {
          id: q.section_id,
          title: q.section_title,
          questions: []
        });
      }
      secMap.get(q.section_id).questions.push(q);
    });

    this.sections = Array.from(secMap.values());
    this.stages = [];

    let globalStageId = 1;
    this.sections.forEach((sec) => {
      const totalInSec = sec.questions.length;
      const pageSize = 10;
      const stageCount = Math.ceil(totalInSec / pageSize);

      for (let i = 0; i < stageCount; i++) {
        const slice = sec.questions.slice(i * pageSize, (i + 1) * pageSize);
        this.stages.push({
          id: globalStageId++,
          sectionId: sec.id,
          sectionTitle: sec.title,
          stageNum: i + 1,
          stageCount: stageCount,
          name: `${sec.title} - ステージ ${i + 1}`,
          questionIds: slice.map((q) => q.id),
          questions: slice
        });
      }
    });
  }

  // 実践50問ステージ学習の開始
  startPracticeStage(stageId) {
    const stage = this.practiceStages.find((s) => s.id === stageId);
    if (!stage) return false;

    this.currentMode = "practice_stage";
    this.currentStageId = stageId;
    this.currentQuestions = [...stage.questions];
    this.currentIndex = 0;
    this.correctCount = 0;
    this.userAnswers = [];
    return true;
  }

  // ステージ学習の開始
  startStage(stageId) {
    const stage = this.stages.find((s) => s.id === stageId);
    if (!stage) return false;

    this.currentMode = "stage";
    this.currentStageId = stageId;
    this.currentQuestions = [...stage.questions];
    this.currentIndex = 0;
    this.correctCount = 0;
    this.userAnswers = [];
    return true;
  }

  // 弱点克服モードの開始
  startWeakPoints(weakIds) {
    if (!weakIds || weakIds.length === 0) return false;
    const allPool = [...this.questions, ...this.practiceQuestions];
    const weakList = allPool.filter((q) => weakIds.includes(q.id || q.q_num));
    if (weakList.length === 0) return false;

    // シャッフルして最大15問
    const shuffled = [...weakList].sort(() => Math.random() - 0.5).slice(0, 15);
    this.currentMode = "weak";
    this.currentQuestions = shuffled;
    this.currentIndex = 0;
    this.correctCount = 0;
    this.userAnswers = [];
    return true;
  }

  // 本番模擬試験モードの開始 (50問・90分)
  startMockExam() {
    this.currentMode = "mock";
    this.currentIndex = 0;
    this.correctCount = 0;
    this.userAnswers = [];
    this.mockRemainingSeconds = 90 * 60;

    // 各セクションから均等に合計50問を抽出
    const sample = [];
    this.sections.forEach((sec) => {
      // セクションの問題数比率に応じて約8〜9問
      const count = Math.round((sec.questions.length / this.questions.length) * 50);
      const shuffled = [...sec.questions].sort(() => Math.random() - 0.5);
      sample.push(...shuffled.slice(0, count));
    });

    // 50問に調整
    const finalQuestions = sample.slice(0, 50).sort(() => Math.random() - 0.5);
    this.currentQuestions = finalQuestions;
    return true;
  }

  // ビジネス課題フラッシュ（10問高速特訓）
  startFlashMode() {
    this.currentMode = "flash";
    this.currentIndex = 0;
    this.correctCount = 0;
    this.userAnswers = [];
    // ランダムに10問ピックアップ（全問題から）
    const allPool = [...this.questions, ...this.practiceQuestions];
    this.currentQuestions = [...allPool].sort(() => Math.random() - 0.5).slice(0, 10);
    return true;
  }

  getCurrentQuestion() {
    if (this.currentIndex >= this.currentQuestions.length) return null;
    return this.currentQuestions[this.currentIndex];
  }

  _normalizeAnswers(val) {
    if (Array.isArray(val)) {
      return val.map((s) => String(s).trim().toUpperCase()).sort();
    }
    if (typeof val === "string") {
      if (val.includes(",")) {
        return val.split(",").map((s) => s.trim().toUpperCase()).sort();
      }
      return [val.trim().toUpperCase()];
    }
    return [];
  }

  answerCurrent(selected) {
    const q = this.getCurrentQuestion();
    if (!q) return null;

    const userAns = this._normalizeAnswers(selected);
    const correctAns = this._normalizeAnswers(q.answer);

    const isCorrect = userAns.length === correctAns.length &&
                      userAns.every((val, idx) => val === correctAns[idx]);

    if (isCorrect) {
      this.correctCount++;
    }

    const qId = q.id || q.q_num;
    this.userAnswers.push({
      qId: qId,
      selected: selected,
      correct: q.answer,
      isCorrect: isCorrect
    });

    return {
      isCorrect: isCorrect,
      correctAnswer: q.answer,
      explanation: q.explanation,
      businessTip: q.business_tip,
      qId: qId
    };
  }

  nextQuestion() {
    this.currentIndex++;
    return this.currentIndex < this.currentQuestions.length;
  }

  getResult() {
    const total = this.currentQuestions.length;
    const score = this.correctCount;
    const rate = total > 0 ? Math.round((score / total) * 100) : 0;
    const passed = rate >= 70; // 70%以上で合格

    // セクション別スコア算出
    const secStats = {};
    this.userAnswers.forEach((ans) => {
      const q = this.questions.find((x) => x.id === ans.qId) || this.practiceQuestions.find((x) => (x.id || x.q_num) === ans.qId);
      if (!q) return;
      const secId = q.section_id || "practice";
      const secTitle = q.section_title || "実践対策 厳選50問";
      if (!secStats[secId]) {
        secStats[secId] = { title: secTitle, correct: 0, total: 0 };
      }
      secStats[secId].total++;
      if (ans.isCorrect) secStats[secId].correct++;
    });

    return {
      total,
      score,
      rate,
      passed,
      secStats,
      answers: this.userAnswers
    };
  }
}

window.QuizEngine = QuizEngine;
