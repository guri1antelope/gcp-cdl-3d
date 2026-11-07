/**
 * Storage & Save Slot Manager for GCP CDL 3D
 * Handles LocalStorage persistence, multi-slot, test date countdown,
 * study progress, weak points, and device sync export/import.
 */

const MAX_SLOTS = 4;
const TARGET_EXAM_DATE = "2026-12-15";

const PARTNER_SPECIES = [
  "",
  "柴犬",
  "トラネコ",
  "ロップイヤー",
  "シマリス",
  "ペンギン"
];

const STAGE_NAMES = {
  1: ["", "しばいぬのタマゴ", "こいぬ", "柴犬", "探検柴犬"],
  2: ["", "トラネコのタマゴ", "こねこ", "トラネコ", "レディキャット"],
  3: ["", "ウサギのタマゴ", "こうさぎ", "ロップイヤー", "ロイヤルガード"],
  4: ["", "シマリスのタマゴ", "こリス", "シマリス", "オックスフォード教授"],
  5: ["", "ペンギンのタマゴ", "ペンギンヒナ", "ペンギン成鳥", "キャプテンペンギン"]
};

// ビジネス称号（プレイヤーのレベルに応じた職階）
function getBusinessTitle(level) {
  if (level >= 30) return "CDLマスター（合格圏突破）";
  if (level >= 20) return "DXプロジェクトリーダー";
  if (level >= 12) return "クラウド戦略マネージャー";
  if (level >= 6)  return "クラウド推進担当";
  return "見習いDX推進担当";
}

const EXP_PER_LEVEL = 100;
const EVOLUTION_LEVELS = {
  1: 1,  // タマゴ
  2: 5,  // 幼体
  3: 15, // 成体
  4: 30  // 究極体
};

class StorageManager {
  constructor() {
    this.currentSlot = 1;
    this.slots = {};
    this.loadAllSlots();
  }

  getStorageKey(slotId) {
    return `gcp_cdl_3d_slot_${slotId}`;
  }

  getDefaultSlotData(slotId, playerName = "受験生", partnerId = 1) {
    const today = new Date().toISOString().split("T")[0];
    return {
      slotId: slotId,
      playerName: playerName.slice(0, 8) || "受験生",
      partner: {
        id: partnerId,
        stage: 1,
        level: 1,
        exp: 0,
        fullness: 100
      },
      inventory: {
        apple: 5,
        meat: 2,
        golden: 1
      },
      stats: {
        totalSolved: 0,
        totalCorrect: 0,
        streakDays: 1,
        lastLoginDate: today
      },
      clearedStages: [],      // クリアしたステージ番号 (例: [1, 2])
      weakQuestions: [],      // 間違えた問題ID (克服するまで残る)
      bookmarkedQuestions: [],// 手動チェックした問題ID
      mockExamHistory: []     // 模擬試験の受験履歴 [{date, score, total, secScores}]
    };
  }

  loadAllSlots() {
    for (let i = 1; i <= MAX_SLOTS; i++) {
      const key = this.getStorageKey(i);
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          this.slots[i] = JSON.parse(raw);
        } catch (e) {
          this.slots[i] = null;
        }
      } else {
        this.slots[i] = null;
      }
    }
  }

  getDaysUntilExam() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = new Date(TARGET_EXAM_DATE);
    examDate.setHours(0, 0, 0, 0);
    const diffTime = examDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  getActiveData() {
    return this.slots[this.currentSlot];
  }

  saveActiveData() {
    if (!this.slots[this.currentSlot]) return;
    const key = this.getStorageKey(this.currentSlot);
    localStorage.setItem(key, JSON.stringify(this.slots[this.currentSlot]));
  }

  createSlot(slotId, playerName, partnerId) {
    const data = this.getDefaultSlotData(slotId, playerName, partnerId);
    this.slots[slotId] = data;
    this.currentSlot = slotId;
    this.saveActiveData();
    return data;
  }

  deleteSlot(slotId) {
    const key = this.getStorageKey(slotId);
    localStorage.removeItem(key);
    this.slots[slotId] = null;
  }

  addExp(amount) {
    const data = this.getActiveData();
    if (!data) return { leveledUp: false, evolved: false };

    data.partner.exp += amount;
    let leveledUp = false;
    let evolved = false;

    while (data.partner.exp >= EXP_PER_LEVEL) {
      data.partner.exp -= EXP_PER_LEVEL;
      data.partner.level += 1;
      leveledUp = true;

      // 進化チェック
      const curStage = data.partner.stage;
      if (curStage < 4) {
        const nextReq = EVOLUTION_LEVELS[curStage + 1];
        if (data.partner.level >= nextReq) {
          data.partner.stage += 1;
          evolved = true;
        }
      }
    }

    this.saveActiveData();
    return { leveledUp, evolved, currentLevel: data.partner.level, currentStage: data.partner.stage };
  }

  recordAnswer(questionId, isCorrect) {
    const data = this.getActiveData();
    if (!data) return;

    data.stats.totalSolved += 1;
    if (isCorrect) {
      data.stats.totalCorrect += 1;
      // 弱点克服チェック: 弱点リストにあれば削除
      const idx = data.weakQuestions.indexOf(questionId);
      if (idx !== -1) {
        data.weakQuestions.splice(idx, 1);
      }
    } else {
      // 弱点リストに追加
      if (!data.weakQuestions.includes(questionId)) {
        data.weakQuestions.push(questionId);
      }
    }
    this.saveActiveData();
  }

  toggleBookmark(questionId) {
    const data = this.getActiveData();
    if (!data) return false;

    const idx = data.bookmarkedQuestions.indexOf(questionId);
    if (idx !== -1) {
      data.bookmarkedQuestions.splice(idx, 1);
      this.saveActiveData();
      return false;
    } else {
      data.bookmarkedQuestions.push(questionId);
      this.saveActiveData();
      return true;
    }
  }

  // 端末間同期・バックアップコードの生成
  exportBackupCode() {
    const data = this.getActiveData();
    if (!data) return "";
    const str = JSON.stringify(data);
    return btoa(encodeURIComponent(str));
  }

  // バックアップコードの復元
  importBackupCode(codeStr) {
    try {
      const decoded = decodeURIComponent(atob(codeStr.trim()));
      const obj = JSON.parse(decoded);
      if (!obj.playerName || !obj.partner) {
        throw new Error("無効なデータ形式です");
      }
      this.slots[this.currentSlot] = obj;
      this.saveActiveData();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

window.StorageManager = StorageManager;
window.getBusinessTitle = getBusinessTitle;
window.PARTNER_SPECIES = PARTNER_SPECIES;
window.STAGE_NAMES = STAGE_NAMES;
