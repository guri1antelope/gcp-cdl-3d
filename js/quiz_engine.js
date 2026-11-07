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
    this.currentMode = null; // 'stage', 'weak', 'mock', 'flash'
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
      return true;
    } catch (e) {
      console.error("Failed to load questions:", e);
      return false;
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
    const weakList = this.questions.filter((q) => weakIds.includes(q.id));
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
    // ランダムに10問ピックアップ
    this.currentQuestions = [...this.questions].sort(() => Math.random() - 0.5).slice(0, 10);
    return true;
  }

  getCurrentQuestion() {
    if (this.currentIndex >= this.currentQuestions.length) return null;
    return this.currentQuestions[this.currentIndex];
  }

  answerCurrent(selectedLabel) {
    const q = this.getCurrentQuestion();
    if (!q) return null;

    const isCorrect = q.answer.trim().toUpperCase() === selectedLabel.trim().toUpperCase();
    if (isCorrect) {
      this.correctCount++;
    }

    this.userAnswers.push({
      qId: q.id,
      selected: selectedLabel,
      correct: q.answer,
      isCorrect: isCorrect
    });

    return {
      isCorrect: isCorrect,
      correctAnswer: q.answer,
      explanation: q.explanation,
      businessTip: q.business_tip,
      qId: q.id
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
      const q = this.questions.find((x) => x.id === ans.qId);
      if (!q) return;
      if (!secStats[q.section_id]) {
        secStats[q.section_id] = { title: q.section_title, correct: 0, total: 0 };
      }
      secStats[q.section_id].total++;
      if (ans.isCorrect) secStats[q.section_id].correct++;
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
