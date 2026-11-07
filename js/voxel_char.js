/**
 * 3D Character & Prop Builder for EIKEN 3D
 * Constructs rich, stylized polygon 3D characters for 5 species x 4 evolution stages,
 * 3D interactive food items (apple, meat, golden apple), and dynamic vector portraits.
 */

class VoxelCharacterManager {
  constructor() {
    this.cache = new Map();
    this.portraitCache = new Map();

    // 共通マテリアルプリセット（ツヤと温かみのある3D質感）
    this.mats = {
      eyeBlack: new THREE.MeshBasicMaterial({ color: 0x111625 }),
      eyeWhite: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      eyeGreen: new THREE.MeshBasicMaterial({ color: 0x00cc77 }),
      cheekPink: new THREE.MeshBasicMaterial({ color: 0xff6688, transparent: true, opacity: 0.85 }),
      beakYellow: new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.3, metalness: 0.1 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.2, metalness: 0.85 }),
      silver: new THREE.MeshStandardMaterial({ color: 0xe0e6ed, roughness: 0.2, metalness: 0.7 }),
      boneWhite: new THREE.MeshStandardMaterial({ color: 0xf5f7fa, roughness: 0.3 }),
      meatBrown: new THREE.MeshStandardMaterial({ color: 0xbb4422, roughness: 0.4 }),
      appleRed: new THREE.MeshStandardMaterial({ color: 0xee2233, roughness: 0.25 }),
      leafGreen: new THREE.MeshStandardMaterial({ color: 0x33cc44, roughness: 0.3 })
    };
  }

  /**
   * 3Dキャラクターモデルの構築
   * @param {number} partnerId 1:柴犬, 2:子猫, 3:ウサギ, 4:シマリス, 5:ペンギン
   * @param {number} stage 1:タマゴ, 2:こども, 3:おとな, 4:マスター
   */
  async loadVoxelModel(imageUrl, partnerId = 1, stage = 1) {
    const key = `${partnerId}_${stage}`;
    if (this.cache.has(key)) {
      return this.cloneCharacterGroup(this.cache.get(key));
    }

    const group = this.build3DCharacter(partnerId, stage);
    this.cache.set(key, group);
    return this.cloneCharacterGroup(group);
  }

  /**
   * キャラクターモデルのクローン（Three.jsグループのディープコピー）
   */
  cloneCharacterGroup(sourceGroup) {
    const cloned = sourceGroup.clone(true);
    // 参照パーツ（アニメーション用）を再バインド
    cloned.userData = { ...sourceGroup.userData };
    cloned.traverse((child) => {
      if (child.name) cloned.userData[child.name] = child;
    });
    return cloned;
  }

  /**
   * 3Dキャラクターのモデリング（各種族ごとの造形）
   */
  build3DCharacter(partnerId, stage) {
    const root = new THREE.Group();
    root.userData = { partnerId, stage, animParts: {} };

    // ベース色・サブ色の設定
    let bodyMat, subMat, accentMat;

    switch (partnerId) {
      case 1: // 柴犬
        bodyMat = new THREE.MeshStandardMaterial({ color: 0xd97724, roughness: 0.4 }); // 赤柴
        subMat = new THREE.MeshStandardMaterial({ color: 0xfff3e0, roughness: 0.4 });  // 白
        accentMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.3 }); // 赤首輪
        break;
      case 2: // 子猫
        bodyMat = new THREE.MeshStandardMaterial({ color: 0xf09040, roughness: 0.4 }); // 茶トラ
        subMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.4 });
        accentMat = new THREE.MeshStandardMaterial({ color: 0xff3388, roughness: 0.3 }); // ピンクリボン
        break;
      case 3: // ウサギ
        bodyMat = new THREE.MeshStandardMaterial({ color: stage === 3 ? 0xfef08a : 0xffffff, roughness: 0.35 });
        subMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.35 }); // 桜色
        accentMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 }); // 水色
        break;
      case 4: // シマリス
        bodyMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.4 }); // 栗色
        subMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.4 });
        accentMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.3 }); // 緑
        break;
      case 5: // ペンギン
      default:
        bodyMat = new THREE.MeshStandardMaterial({ color: stage >= 3 ? 0x1e293b : 0x38bdf8, roughness: 0.35 }); // 水色/濃紺
        subMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
        accentMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });
        break;
    }

    if (stage === 1) {
      // ========= Stage 1: タマゴ形態 =========
      this.buildEggCharacter(root, partnerId, bodyMat, subMat);
    } else {
      // ========= Stage 2〜4: 2頭身立体キャラクター =========
      this.buildAnimalCharacter(root, partnerId, stage, bodyMat, subMat, accentMat);
    }

    // 全体スケールを統一 (高さ約 2.5m 基準)
    root.scale.set(1.15, 1.15, 1.15);
    return root;
  }

  /**
   * Stage 1: 各種族の特徴を持つかわいい3Dタマゴ
   */
  buildEggCharacter(root, partnerId, bodyMat, subMat) {
    // タマゴ本体
    const eggGeo = new THREE.SphereGeometry(1.0, 24, 20);
    eggGeo.scale(0.95, 1.25, 0.95);
    const eggMesh = new THREE.Mesh(eggGeo, bodyMat);
    eggMesh.castShadow = true;
    eggMesh.position.y = 1.25;
    root.add(eggMesh);

    // お腹の白い楕円パッチ
    const bellyGeo = new THREE.SphereGeometry(0.75, 16, 16);
    bellyGeo.scale(0.9, 1.1, 0.4);
    const belly = new THREE.Mesh(bellyGeo, subMat);
    belly.position.set(0, 1.1, 0.65);
    root.add(belly);

    // つぶらな黒目＆ハイライト
    this.addEyesAndCheeks(root, 0, 1.45, 0.88, 0.38);

    // 種族固有のタマゴ装飾
    if (partnerId === 1) {
      // 柴犬: 小さな三角耳＆麻呂眉
      this.addDogEars(root, bodyMat, subMat, 0.7, 2.1, 0.1, 0.35);
      this.addMaroEyebrows(root, 1.62, 0.82);
    } else if (partnerId === 2) {
      // 子猫: ピンクの猫耳
      this.addCatEars(root, bodyMat, 0.7, 2.1, 0.1, 0.35);
    } else if (partnerId === 3) {
      // ウサギ: 頭の上に長いウサギ耳
      this.addRabbitEars(root, bodyMat, subMat, 0.45, 2.3, 0.1, 0.4);
    } else if (partnerId === 4) {
      // リス: ドングリの笠帽子
      const capGeo = new THREE.ConeGeometry(0.7, 0.45, 16);
      const capMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(0, 2.35, 0);
      root.add(cap);
    } else if (partnerId === 5) {
      // ペンギン: 小さな黄色いくちばし＆左右のちびフリッパー
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.35, 12), this.mats.beakYellow);
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 1.35, 0.95);
      root.add(beak);
    }
  }

  /**
   * Stage 2〜4: 2頭身の立体小動物キャラクター
   */
  buildAnimalCharacter(root, partnerId, stage, bodyMat, subMat, accentMat) {
    const isBaby = stage === 2;
    const isAdult = stage === 3;
    const isMaster = stage === 4;

    // 1. 大きな頭（ヘッドグループ）
    const headGroup = new THREE.Group();
    headGroup.name = "headGroup";
    headGroup.position.set(0, 1.55, 0);

    const headRadius = isBaby ? 0.95 : 0.92;
    const headGeo = new THREE.SphereGeometry(headRadius, 24, 20);
    headGeo.scale(1.05, 0.95, 1.0);
    const headMesh = new THREE.Mesh(headGeo, bodyMat);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // ぷっくり白いマズル/ほっぺ
    const muzzleGeo = new THREE.SphereGeometry(0.55, 16, 14);
    muzzleGeo.scale(1.15, 0.75, 0.7);
    const muzzle = new THREE.Mesh(muzzleGeo, subMat);
    muzzle.position.set(0, -0.15, 0.65);
    headGroup.add(muzzle);

    // つぶらな黒目＆キラキラハイライト＆ピンクのほっぺ
    this.addEyesAndCheeks(headGroup, 0, 0.08, 0.88, isBaby ? 0.45 : 0.42);

    // 2. 種族固有の耳・鼻・くちばし
    if (partnerId === 1) {
      // 柴犬: 三角耳、黒い鼻、麻呂眉
      this.addDogEars(headGroup, bodyMat, subMat, 0.68, 0.75, 0.1, 0.45);
      this.addCuteNose(headGroup, 0, -0.05, 0.98);
      this.addMaroEyebrows(headGroup, 0.28, 0.85);
    } else if (partnerId === 2) {
      // 子猫: 猫耳、ピンクの小鼻
      this.addCatEars(headGroup, bodyMat, 0.68, 0.75, 0.1, 0.45);
      this.addCuteNose(headGroup, 0, -0.05, 0.98, 0xff88aa);
    } else if (partnerId === 3) {
      // ウサギ: 長い耳 (ロップイヤーは垂れ耳)
      if (stage === 3) {
        this.addDroopyRabbitEars(headGroup, bodyMat, subMat);
      } else {
        this.addRabbitEars(headGroup, bodyMat, subMat, 0.45, 0.95, 0.0, 0.55);
      }
      this.addCuteNose(headGroup, 0, -0.05, 0.98, 0xff99bb);
    } else if (partnerId === 4) {
      // リス: 丸い小耳、黒鼻
      this.addRoundEars(headGroup, bodyMat, 0.7, 0.7, 0.1, 0.35);
      this.addCuteNose(headGroup, 0, -0.05, 0.98);
    } else if (partnerId === 5) {
      // ペンギン: 黄色いくちばし
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 12), this.mats.beakYellow);
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, -0.08, 0.98);
      headGroup.add(beak);
    }

    root.add(headGroup);
    root.userData.head = headGroup;

    // 3. まんまる胴体（ボディ）
    const bodyGroup = new THREE.Group();
    bodyGroup.name = "bodyGroup";
    bodyGroup.position.set(0, 0.75, 0);

    const bodyGeo = new THREE.SphereGeometry(0.72, 20, 16);
    bodyGeo.scale(1.0, 1.05, 0.95);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    bodyGroup.add(bodyMesh);

    // お腹の白パッチ
    const bellyGeo = new THREE.SphereGeometry(0.55, 16, 14);
    bellyGeo.scale(0.9, 1.0, 0.4);
    const belly = new THREE.Mesh(bellyGeo, subMat);
    belly.position.set(0, 0.02, 0.58);
    bodyGroup.add(belly);

    // 4. 手足・翼（アニメーション用パーツ）
    const leftArm = new THREE.Group();
    leftArm.name = "leftArm";
    const rightArm = new THREE.Group();
    rightArm.name = "rightArm";

    if (partnerId === 5) {
      // ペンギンの翼（フリッパー）
      const wingGeo = new THREE.ConeGeometry(0.22, 0.75, 12);
      wingGeo.scale(1.2, 1.0, 0.3);
      const wingL = new THREE.Mesh(wingGeo, bodyMat);
      wingL.rotation.z = -Math.PI / 3.5;
      wingL.position.set(-0.25, -0.2, 0);
      leftArm.position.set(-0.62, 0.22, 0);
      leftArm.add(wingL);

      const wingR = new THREE.Mesh(wingGeo, bodyMat);
      wingR.rotation.z = Math.PI / 3.5;
      wingR.position.set(0.25, -0.2, 0);
      rightArm.position.set(0.62, 0.22, 0);
      rightArm.add(wingR);
    } else {
      // 四足/小動物の手（前足）
      const armGeo = new THREE.SphereGeometry(0.22, 12, 10);
      armGeo.scale(0.9, 1.4, 0.9);
      const armL = new THREE.Mesh(armGeo, subMat);
      armL.position.set(0, -0.2, 0);
      leftArm.position.set(-0.55, 0.15, 0.25);
      leftArm.add(armL);

      const armR = new THREE.Mesh(armGeo, subMat);
      armR.position.set(0, -0.2, 0);
      rightArm.position.set(0.55, 0.15, 0.25);
      rightArm.add(armR);
    }
    bodyGroup.add(leftArm);
    bodyGroup.add(rightArm);
    root.userData.leftArm = leftArm;
    root.userData.rightArm = rightArm;

    // 足（左右）
    const legGeo = new THREE.SphereGeometry(0.25, 12, 10);
    legGeo.scale(1.0, 0.65, 1.3);
    const footMat = partnerId === 5 ? this.mats.beakYellow : subMat;

    const leftLeg = new THREE.Group();
    leftLeg.name = "leftLeg";
    const footL = new THREE.Mesh(legGeo, footMat);
    footL.position.set(0, 0, 0.1);
    leftLeg.position.set(-0.35, -0.58, 0);
    leftLeg.add(footL);

    const rightLeg = new THREE.Group();
    rightLeg.name = "rightLeg";
    const footR = new THREE.Mesh(legGeo, footMat);
    footR.position.set(0, 0, 0.1);
    rightLeg.position.set(0.35, -0.58, 0);
    rightLeg.add(footR);

    bodyGroup.add(leftLeg);
    bodyGroup.add(rightLeg);
    root.userData.leftLeg = leftLeg;
    root.userData.rightLeg = rightLeg;

    // 5. 尻尾（テイル）
    const tailGroup = new THREE.Group();
    tailGroup.name = "tailGroup";
    tailGroup.position.set(0, -0.15, -0.62);

    if (partnerId === 1) {
      // 柴犬: 大きな3Dくるりん尻尾
      const tailGeo = new THREE.TorusGeometry(0.32, 0.14, 10, 16, Math.PI * 1.5);
      const tail = new THREE.Mesh(tailGeo, bodyMat);
      tail.rotation.y = Math.PI / 2;
      tail.rotation.z = Math.PI / 4;
      tailGroup.add(tail);
    } else if (partnerId === 2) {
      // 子猫: S字に揺れるしなやかな尻尾
      const tailGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.85, 10);
      const tail = new THREE.Mesh(tailGeo, bodyMat);
      tail.position.set(0, 0.35, -0.2);
      tail.rotation.x = -Math.PI / 3;
      tailGroup.add(tail);
    } else if (partnerId === 3) {
      // ウサギ: ふわふわの丸いポンポン尻尾
      const tailGeo = new THREE.SphereGeometry(0.22, 12, 12);
      const tail = new THREE.Mesh(tailGeo, this.mats.boneWhite);
      tailGroup.add(tail);
    } else if (partnerId === 4) {
      // シマリス: 自分の体より大きい特大の巻きしっぽ！
      const tailGeo = new THREE.TorusGeometry(0.65, 0.28, 12, 20, Math.PI * 1.4);
      const tailMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.5 });
      const tail = new THREE.Mesh(tailGeo, tailMat);
      tail.rotation.y = Math.PI / 2;
      tail.rotation.z = -Math.PI / 6;
      tail.position.set(0, 0.45, 0);
      tailGroup.add(tail);
    }
    bodyGroup.add(tailGroup);
    root.userData.tail = tailGroup;

    root.add(bodyGroup);
    root.userData.body = bodyGroup;

    // 表情パーツ・可動耳へのショートカット参照をroot.userDataに配備
    if (headGroup.userData.mouth) root.userData.mouth = headGroup.userData.mouth;
    if (headGroup.userData.happyEyes) root.userData.happyEyes = headGroup.userData.happyEyes;
    if (headGroup.userData.normalEyes) root.userData.normalEyes = headGroup.userData.normalEyes;
    if (headGroup.userData.leftEar) root.userData.leftEar = headGroup.userData.leftEar;
    if (headGroup.userData.rightEar) root.userData.rightEar = headGroup.userData.rightEar;

    // 6. 進化段階ごとの豪華アクセサリー装備 (Stage 3 & 4)
    if (isAdult) {
      this.addAdultAccessories(root, partnerId, accentMat);
    } else if (isMaster) {
      this.addMasterAccessories(root, partnerId, accentMat);
    }
  }

  /**
   * Stage 3 アクセサリー（首輪・マフラー・リボン・飾り羽）
   */
  addAdultAccessories(root, partnerId, accentMat) {
    if (partnerId === 1) {
      // 赤い首輪 ＋ 黄金の鈴
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.08, 8, 20), accentMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, 1.25, 0);
      root.add(collar);
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), this.mats.gold);
      bell.position.set(0, 1.15, 0.72);
      root.add(bell);
    } else if (partnerId === 2) {
      // ピンクリボン ＋ ハート金鈴
      const bowGeo = new THREE.BoxGeometry(0.35, 0.2, 0.12);
      const bow = new THREE.Mesh(bowGeo, accentMat);
      bow.position.set(0, 1.22, 0.7);
      root.add(bow);
    } else if (partnerId === 3) {
      // スカイブルーの蝶ネクタイ
      const bowGeo = new THREE.BoxGeometry(0.38, 0.22, 0.12);
      const bow = new THREE.Mesh(bowGeo, accentMat);
      bow.position.set(0, 1.22, 0.7);
      root.add(bow);
    } else if (partnerId === 4) {
      // グリーンのマフラー
      const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.1, 8, 16), accentMat);
      scarf.rotation.x = Math.PI / 2;
      scarf.position.set(0, 1.25, 0);
      root.add(scarf);
    } else if (partnerId === 5) {
      // ストライプマフラー
      const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.1, 8, 16), this.mats.gold);
      scarf.rotation.x = Math.PI / 2;
      scarf.position.set(0, 1.25, 0);
      root.add(scarf);
    }
  }

  /**
   * Stage 4 マスター形態の豪華3D装備（探検帽・王冠・近衛兵帽・角帽・船長帽・マント）
   */
  addMasterAccessories(root, partnerId, accentMat) {
    const head = root.userData.head;

    if (partnerId === 1) {
      // 探検柴犬: サファリ探検帽 ＋ ゴーグル ＋ 背中の冒険マント
      const hatGeo = new THREE.CylinderGeometry(0.65, 0.88, 0.45, 18);
      const hatMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.5 });
      const hat = new THREE.Mesh(hatGeo, hatMat);
      hat.position.set(0, 0.95, 0);
      head.add(hat);

      // ゴーグル
      const goggleFrame = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.22, 0.15), this.mats.gold);
      goggleFrame.position.set(0, 0.92, 0.72);
      head.add(goggleFrame);

      // マント
      this.addHeroCape(root, 0xef4444);

    } else if (partnerId === 2) {
      // レディキャット: 黄金のティアラ（王冠）＋ ロイヤルピンクケープ
      const crownGeo = new THREE.CylinderGeometry(0.42, 0.35, 0.35, 8);
      const crown = new THREE.Mesh(crownGeo, this.mats.gold);
      crown.position.set(0, 1.05, 0);
      head.add(crown);

      this.addHeroCape(root, 0xf43f5e);

    } else if (partnerId === 3) {
      // ロイヤルガード: ベアスキン近衛兵帽 ＋ 真紅のマント
      const bearHatGeo = new THREE.CylinderGeometry(0.58, 0.58, 1.1, 16);
      const bearHatMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
      const bearHat = new THREE.Mesh(bearHatGeo, bearHatMat);
      bearHat.position.set(0, 1.25, 0);
      head.add(bearHat);

      this.addHeroCape(root, 0xdc2626);

    } else if (partnerId === 4) {
      // オックスフォード教授: 四角い卒業角帽（モルタルボード）＋ 金縁メガネ
      const boardGeo = new THREE.BoxGeometry(1.2, 0.08, 1.2);
      const boardMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.5 });
      const board = new THREE.Mesh(boardGeo, boardMat);
      board.position.set(0, 1.05, 0);
      board.rotation.y = Math.PI / 4;
      head.add(board);

      // 丸メガネ
      const glassL = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 8, 16), this.mats.gold);
      glassL.position.set(-0.25, 0.08, 0.95);
      head.add(glassL);
      const glassR = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 8, 16), this.mats.gold);
      glassR.position.set(0.25, 0.08, 0.95);
      head.add(glassR);

      this.addHeroCape(root, 0x312e81);

    } else if (partnerId === 5) {
      // キャプテンペンギン: キャプテン制帽 ＋ 錨徽章 ＋ ネイビーマント
      const capGeo = new THREE.CylinderGeometry(0.68, 0.72, 0.38, 18);
      const capMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(0, 0.95, 0);
      head.add(cap);

      // 黒いツバ
      const visorGeo = new THREE.CylinderGeometry(0.72, 0.75, 0.08, 16, 1, false, 0, Math.PI);
      const visorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 });
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 0.85, 0.3);
      head.add(visor);

      this.addHeroCape(root, 0x1e3a8a);
    }
  }

  /**
   * 風になびく3Dマント
   */
  addHeroCape(root, hexColor) {
    const capeGeo = new THREE.PlaneGeometry(1.1, 1.3, 4, 4);
    const capeMat = new THREE.MeshStandardMaterial({
      color: hexColor,
      roughness: 0.4,
      side: THREE.DoubleSide
    });
    const cape = new THREE.Mesh(capeGeo, capeMat);
    cape.position.set(0, 0.65, -0.65);
    cape.rotation.x = Math.PI / 12;
    cape.castShadow = true;
    root.add(cape);
    root.userData.cape = cape;
  }

  /**
   * つぶらな黒目＆笑顔目＆開閉口＆ピンクほっぺ
   */
  addEyesAndCheeks(parent, x, y, z, eyeDist) {
    // 1. 通常目グループ
    const normalEyes = new THREE.Group();
    normalEyes.name = "normalEyes";

    const eyeGeo = new THREE.SphereGeometry(0.13, 14, 12);
    eyeGeo.scale(0.85, 1.15, 0.4);
    const hlGeo = new THREE.SphereGeometry(0.045, 8, 8);

    const eyeL = new THREE.Mesh(eyeGeo, this.mats.eyeBlack);
    eyeL.position.set(-eyeDist, y, z);
    const hlL = new THREE.Mesh(hlGeo, this.mats.eyeWhite);
    hlL.position.set(-eyeDist - 0.03, y + 0.05, z + 0.05);
    normalEyes.add(eyeL);
    normalEyes.add(hlL);

    const eyeR = new THREE.Mesh(eyeGeo, this.mats.eyeBlack);
    eyeR.position.set(eyeDist, y, z);
    const hlR = new THREE.Mesh(hlGeo, this.mats.eyeWhite);
    hlR.position.set(eyeDist - 0.03, y + 0.05, z + 0.05);
    normalEyes.add(eyeR);
    normalEyes.add(hlR);
    parent.add(normalEyes);
    parent.userData.normalEyes = normalEyes;

    // 2. 笑顔目グループ (^ ^ アーチ型)
    const happyEyes = new THREE.Group();
    happyEyes.name = "happyEyes";
    happyEyes.visible = false;

    const archGeo = new THREE.TorusGeometry(0.11, 0.032, 8, 16, Math.PI);
    const archMat = new THREE.MeshBasicMaterial({ color: 0x111625 });

    const archL = new THREE.Mesh(archGeo, archMat);
    archL.rotation.z = 0; // 上アーチ ^
    archL.position.set(-eyeDist, y, z + 0.02);
    happyEyes.add(archL);

    const archR = new THREE.Mesh(archGeo, archMat);
    archR.rotation.z = 0;
    archR.position.set(eyeDist, y, z + 0.02);
    happyEyes.add(archR);
    parent.add(happyEyes);
    parent.userData.happyEyes = happyEyes;

    // 3. ぷっくりピンクほっぺ
    const cheekGeo = new THREE.SphereGeometry(0.13, 10, 8);
    cheekGeo.scale(1.2, 0.8, 0.35);
    const cheekL = new THREE.Mesh(cheekGeo, this.mats.cheekPink);
    cheekL.position.set(-eyeDist - 0.12, y - 0.14, z - 0.03);
    const cheekR = new THREE.Mesh(cheekGeo, this.mats.cheekPink);
    cheekR.position.set(eyeDist + 0.12, y - 0.14, z - 0.03);
    parent.add(cheekL);
    parent.add(cheekR);
    parent.userData.cheekL = cheekL;
    parent.userData.cheekR = cheekR;

    // 4. 開閉する立体のお口 (mouth)
    const mouthGeo = new THREE.SphereGeometry(0.14, 12, 10);
    mouthGeo.scale(1.1, 0.3, 0.5);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0xcc2244 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, y - 0.18, z + 0.08);
    mouth.scale.set(0.6, 0.25, 0.5);
    parent.add(mouth);
    parent.userData.mouth = mouth;
  }

  addCuteNose(parent, x, y, z, hexColor = 0x1e293b) {
    const noseMat = new THREE.MeshStandardMaterial({ color: hexColor, roughness: 0.3 });
    const noseGeo = new THREE.SphereGeometry(0.08, 10, 8);
    noseGeo.scale(1.2, 0.8, 0.7);
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(x, y, z);
    parent.add(nose);
    parent.userData.nose = nose;
  }

  addMaroEyebrows(parent, y, z) {
    const mbGeo = new THREE.SphereGeometry(0.09, 8, 8);
    mbGeo.scale(1.1, 0.8, 0.3);
    const mbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const mbL = new THREE.Mesh(mbGeo, mbMat);
    mbL.position.set(-0.35, y, z);
    const mbR = new THREE.Mesh(mbGeo, mbMat);
    mbR.position.set(0.35, y, z);
    parent.add(mbL);
    parent.add(mbR);
  }

  addDogEars(parent, bodyMat, subMat, x, y, z, scale) {
    const earGeo = new THREE.ConeGeometry(0.35 * scale, 0.85 * scale, 12);
    earGeo.scale(1.0, 1.0, 0.65);

    const earL = new THREE.Mesh(earGeo, bodyMat);
    earL.position.set(-x, y, z);
    earL.rotation.z = Math.PI / 8;
    earL.rotation.x = -Math.PI / 16;
    parent.add(earL);

    const earR = new THREE.Mesh(earGeo, bodyMat);
    earR.position.set(x, y, z);
    earR.rotation.z = -Math.PI / 8;
    earR.rotation.x = -Math.PI / 16;
    parent.add(earR);

    parent.userData.leftEar = earL;
    parent.userData.rightEar = earR;
  }

  addCatEars(parent, bodyMat, x, y, z, scale) {
    const earGeo = new THREE.ConeGeometry(0.36 * scale, 0.75 * scale, 12);
    earGeo.scale(1.1, 1.0, 0.5);

    const earL = new THREE.Mesh(earGeo, bodyMat);
    earL.position.set(-x, y, z);
    earL.rotation.z = Math.PI / 6;
    parent.add(earL);

    const earR = new THREE.Mesh(earGeo, bodyMat);
    earR.position.set(x, y, z);
    earR.rotation.z = -Math.PI / 6;
    parent.add(earR);

    parent.userData.leftEar = earL;
    parent.userData.rightEar = earR;
  }

  addRabbitEars(parent, bodyMat, subMat, x, y, z, scale) {
    const earGeo = new THREE.CylinderGeometry(0.12 * scale, 0.28 * scale, 1.4 * scale, 12);
    earGeo.scale(0.8, 1.0, 0.4);

    const earL = new THREE.Mesh(earGeo, bodyMat);
    earL.position.set(-x, y, z);
    earL.rotation.z = Math.PI / 16;
    parent.add(earL);

    const earR = new THREE.Mesh(earGeo, bodyMat);
    earR.position.set(x, y, z);
    earR.rotation.z = -Math.PI / 16;
    parent.add(earR);

    parent.userData.leftEar = earL;
    parent.userData.rightEar = earR;
  }

  addDroopyRabbitEars(parent, bodyMat, subMat) {
    const earGeo = new THREE.CylinderGeometry(0.16, 0.22, 1.1, 12);
    earGeo.scale(0.7, 1.0, 0.4);

    const earL = new THREE.Mesh(earGeo, bodyMat);
    earL.position.set(-0.85, 0.1, 0);
    earL.rotation.z = Math.PI / 2.2;
    parent.add(earL);

    const earR = new THREE.Mesh(earGeo, bodyMat);
    earR.position.set(0.85, 0.1, 0);
    earR.rotation.z = -Math.PI / 2.2;
    parent.add(earR);

    parent.userData.leftEar = earL;
    parent.userData.rightEar = earR;
  }

  addRoundEars(parent, bodyMat, x, y, z, scale) {
    const earGeo = new THREE.SphereGeometry(0.28 * scale, 12, 10);
    earGeo.scale(1.0, 1.0, 0.4);

    const earL = new THREE.Mesh(earGeo, bodyMat);
    earL.position.set(-x, y, z);
    parent.add(earL);

    const earR = new THREE.Mesh(earGeo, bodyMat);
    earR.position.set(x, y, z);
    parent.add(earR);

    parent.userData.leftEar = earL;
    parent.userData.rightEar = earR;
  }

  /**
   * 浮遊する3Dハートの構築（モグモグ時の幸せエフェクト）
   */
  build3DHeart() {
    const heartGroup = new THREE.Group();
    const heartMat = new THREE.MeshBasicMaterial({ color: 0xff3377 });

    const sphereGeo = new THREE.SphereGeometry(0.2, 12, 12);
    const spL = new THREE.Mesh(sphereGeo, heartMat);
    spL.position.set(-0.14, 0.12, 0);
    heartGroup.add(spL);

    const spR = new THREE.Mesh(sphereGeo, heartMat);
    spR.position.set(0.14, 0.12, 0);
    heartGroup.add(spR);

    const coneGeo = new THREE.ConeGeometry(0.32, 0.45, 12);
    const cone = new THREE.Mesh(coneGeo, heartMat);
    cone.rotation.z = Math.PI;
    cone.position.set(0, -0.1, 0);
    heartGroup.add(cone);

    heartGroup.scale.set(0.8, 0.8, 0.8);
    return heartGroup;
  }

  /**
   * 3D食器・お皿（食事シーン演出用）
   */
  build3DPlate() {
    const plateGroup = new THREE.Group();
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.1 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3, metalness: 0.7 });

    const baseGeo = new THREE.CylinderGeometry(0.75, 0.65, 0.08, 20);
    const plateBase = new THREE.Mesh(baseGeo, plateMat);
    plateBase.castShadow = true;
    plateGroup.add(plateBase);

    const rimGeo = new THREE.TorusGeometry(0.76, 0.04, 8, 24);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.04;
    plateGroup.add(rim);

    return plateGroup;
  }

  /**
   * 3Dフード（リンゴ、骨付き肉、金のリンゴ）のモデリング
   */
  build3DFood(foodType) {
    const group = new THREE.Group();

    if (foodType === "apple") {
      // 🍎 赤いツヤツヤリンゴ
      const appleGeo = new THREE.SphereGeometry(0.55, 18, 16);
      appleGeo.scale(1.0, 0.95, 1.0);
      const appleMesh = new THREE.Mesh(appleGeo, this.mats.appleRed);
      appleMesh.castShadow = true;
      group.add(appleMesh);

      // 茎
      const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8);
      const stem = new THREE.Mesh(stemGeo, new THREE.MeshStandardMaterial({ color: 0x5c2b16 }));
      stem.position.set(0, 0.55, 0);
      stem.rotation.z = Math.PI / 10;
      group.add(stem);

      // 葉
      const leafGeo = new THREE.ConeGeometry(0.18, 0.35, 6);
      leafGeo.scale(1.0, 0.2, 1.5);
      const leaf = new THREE.Mesh(leafGeo, this.mats.leafGreen);
      leaf.position.set(0.14, 0.58, 0);
      leaf.rotation.z = -Math.PI / 4;
      group.add(leaf);

    } else if (foodType === "meat") {
      // 🍖 骨付き肉（マンガ肉）
      const meatGeo = new THREE.CylinderGeometry(0.52, 0.48, 0.85, 16);
      meatGeo.scale(1.2, 1.0, 0.85);
      const meatMesh = new THREE.Mesh(meatGeo, this.mats.meatBrown);
      meatMesh.rotation.z = Math.PI / 2;
      meatMesh.castShadow = true;
      group.add(meatMesh);

      // 骨（両端）
      [-0.65, 0.65].forEach((bx) => {
        const boneShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8), this.mats.boneWhite);
        boneShaft.rotation.z = Math.PI / 2;
        boneShaft.position.x = bx;
        group.add(boneShaft);

        const tip1 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), this.mats.boneWhite);
        tip1.position.set(bx + (bx > 0 ? 0.22 : -0.22), 0.1, 0);
        group.add(tip1);
        const tip2 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), this.mats.boneWhite);
        tip2.position.set(bx + (bx > 0 ? 0.22 : -0.22), -0.1, 0);
        group.add(tip2);
      });

    } else if (foodType === "goldenApple") {
      // ⭐ 金のリンゴ（輝くオーラ＆星）
      const appleGeo = new THREE.SphereGeometry(0.62, 20, 18);
      const appleMesh = new THREE.Mesh(appleGeo, this.mats.gold);
      appleMesh.castShadow = true;
      group.add(appleMesh);

      // オーラリング
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.05, 8, 24), this.mats.gold);
      ring.rotation.x = Math.PI / 3;
      group.add(ring);
    }

    group.scale.set(0.85, 0.85, 0.85);
    return group;
  }

  /**
   * UIアイコン用の高品位3Dベクターポートレート生成（DataURL）
   * ドット絵を排除し、滑らかで鮮明なキャラクターポートレートを返す
   */
  getPortraitDataURL(partnerId, stage) {
    const key = `${partnerId}_${stage}`;
    if (this.portraitCache.has(key)) {
      return this.portraitCache.get(key);
    }

    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");

    // 背景円グラデーション
    const bgGrad = ctx.createRadialGradient(80, 80, 20, 80, 80, 78);
    bgGrad.addColorStop(0, "#1e293b");
    bgGrad.addColorStop(1, "#0f172a");
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.arc(80, 80, 76, 0, Math.PI * 2);
    ctx.fill();

    // 外枠ゴールドリング
    ctx.lineWidth = 6;
    ctx.strokeStyle = stage >= 4 ? "#ffd700" : (stage >= 3 ? "#00d2ff" : "#38bdf8");
    ctx.stroke();

    // 種族・段階に応じた滑らかなベクターキャラクターアート
    this.drawVectorCharacterArt(ctx, partnerId, stage);

    const url = canvas.toDataURL("image/png");
    this.portraitCache.set(key, url);
    return url;
  }

  drawVectorCharacterArt(ctx, partnerId, stage) {
    ctx.save();
    ctx.translate(80, 80);

    const colors = {
      1: { body: "#d97724", sub: "#fff3e0", ear: "#b45309" }, // 柴犬
      2: { body: "#f09040", sub: "#fff7ed", ear: "#ea580c" }, // 子猫
      3: { body: stage === 3 ? "#fef08a" : "#ffffff", sub: "#fce7f3", ear: "#f472b6" }, // ウサギ
      4: { body: "#a16207", sub: "#fef3c7", ear: "#78350f" }, // リス
      5: { body: stage >= 3 ? "#1e293b" : "#38bdf8", sub: "#ffffff", ear: "#f59e0b" }  // ペンギン
    }[partnerId] || { body: "#38bdf8", sub: "#ffffff", ear: "#f59e0b" };

    if (stage === 1) {
      // タマゴ
      ctx.fillStyle = colors.body;
      ctx.beginPath();
      ctx.ellipse(0, 5, 42, 54, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = colors.sub;
      ctx.beginPath();
      ctx.ellipse(0, 15, 30, 36, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 2頭身ボディ＆ヘッド
      ctx.fillStyle = colors.body;
      // ボディ
      ctx.beginPath();
      ctx.ellipse(0, 28, 35, 32, 0, 0, Math.PI * 2);
      ctx.fill();
      // お腹白
      ctx.fillStyle = colors.sub;
      ctx.beginPath();
      ctx.ellipse(0, 28, 24, 25, 0, 0, Math.PI * 2);
      ctx.fill();

      // 耳 (柴犬/猫/ウサギ/リス)
      if (partnerId === 1 || partnerId === 2) {
        ctx.fillStyle = colors.body;
        ctx.beginPath();
        ctx.moveTo(-36, -30);
        ctx.lineTo(-20, -55);
        ctx.lineTo(-6, -35);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(36, -30);
        ctx.lineTo(20, -55);
        ctx.lineTo(6, -35);
        ctx.fill();
      } else if (partnerId === 3) {
        // ウサギ耳
        ctx.fillStyle = colors.body;
        ctx.beginPath();
        ctx.ellipse(-16, -55, 10, 28, -0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(16, -55, 10, 28, 0.15, 0, Math.PI * 2);
        ctx.fill();
      }

      // まんまるヘッド
      ctx.fillStyle = colors.body;
      ctx.beginPath();
      ctx.arc(0, -12, 38, 0, Math.PI * 2);
      ctx.fill();

      // ほっぺマズル白
      ctx.fillStyle = colors.sub;
      ctx.beginPath();
      ctx.ellipse(0, -4, 26, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // くちばし（ペンギン）または鼻
      if (partnerId === 5) {
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.moveTo(-9, -8);
        ctx.lineTo(0, 2);
        ctx.lineTo(9, -8);
        ctx.fill();
      } else {
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.ellipse(0, -8, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 帽子（Stage 4）
      if (stage === 4) {
        ctx.fillStyle = "#ffd700";
        ctx.beginPath();
        ctx.arc(0, -46, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // つぶらな瞳（黒目＋ハイライト）
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.ellipse(-15, -12, 5, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(15, -12, 5, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-16, -15, 3, 0, Math.PI * 2);
    ctx.arc(14, -15, 3, 0, Math.PI * 2);
    ctx.fill();

    // ぷっくりピンクほっぺ
    ctx.fillStyle = "rgba(255, 102, 136, 0.75)";
    ctx.beginPath();
    ctx.arc(-23, -4, 6, 0, Math.PI * 2);
    ctx.arc(23, -4, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  getPartnerImagePath(partnerId, stage) {
    // 互換性維持
    return `assets/images/characters/partner_${partnerId}_stage_${stage}_48.png`;
  }

  /**
   * 3Dボスモンスターの構築（WAVE 1〜3で骨格・パーツ・動きが完全に異なる独立モデリング）
   */
  build3DBoss(bossType = 1) {
    if (bossType === 1) {
      return this.buildMechaGolemBoss();
    } else if (bossType === 2) {
      return this.buildFlameWyvernBoss();
    } else {
      return this.buildAstralEmperorBoss();
    }
  }

  /**
   * WAVE 1: 重装機神 アイアン・ゴーレム
   * 重戦車のような4脚メカ、回転する巨大ドリル腕、6連ガトリング砲、往復スキャンする赤色モノアイ
   */
  buildMechaGolemBoss() {
    const root = new THREE.Group();
    root.userData = { bossType: 1 };

    const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.8 });
    const rustArmorMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.35, metalness: 0.85 });
    const drillMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.95 });
    const monoEyeMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
    const orangeGlowMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });

    // 1. 重装甲キャビン胴体
    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, 1.4, 0);

    const cabinMesh = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.5, 1.6), steelMat);
    cabinMesh.castShadow = true;
    bodyGroup.add(cabinMesh);

    // 胸部ハッチ＆エネルギー炉
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.3), rustArmorMat);
    hatch.position.set(0, 0, 0.85);
    bodyGroup.add(hatch);

    const furnace = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.35, 12), orangeGlowMat);
    furnace.rotation.x = Math.PI / 2;
    furnace.position.set(0, 0, 0.9);
    bodyGroup.add(furnace);
    root.userData.core = furnace;

    // 背部ツイン煙突
    [-0.55, 0.55].forEach((sx) => {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.2, 10), steelMat);
      pipe.position.set(sx, 0.9, -0.65);
      bodyGroup.add(pipe);
    });

    // 2. モノアイ頭部（左右にスキャン移動する赤目バイザー）
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.85, 0.3);

    const headFrame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 0.9), rustArmorMat);
    headGroup.add(headFrame);

    const visorSlit = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.1), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    visorSlit.position.set(0, 0, 0.46);
    headGroup.add(visorSlit);

    const monoEye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), monoEyeMat);
    monoEye.position.set(0, 0, 0.48);
    headGroup.add(monoEye);
    root.userData.monoEye = monoEye; // アニメーションで左右スキャン

    bodyGroup.add(headGroup);
    root.userData.head = headGroup;

    // 3. 右腕: 巨大3段回転ドリル (drill)
    const rightArm = new THREE.Group();
    rightArm.position.set(1.55, 0.15, 0.35);

    const rShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), rustArmorMat);
    rightArm.add(rShoulder);

    const drillGroup = new THREE.Group();
    drillGroup.position.set(0.1, -0.2, 0.6);
    drillGroup.rotation.x = Math.PI / 2;

    const d1 = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 12), drillMat);
    d1.position.y = 0.45;
    drillGroup.add(d1);

    const d2 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 8, 16), steelMat);
    d2.rotation.x = Math.PI / 2;
    drillGroup.add(d2);

    const dSpiral = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.32, 0.8, 6), steelMat);
    dSpiral.position.y = 0.25;
    drillGroup.add(dSpiral);

    rightArm.add(drillGroup);
    bodyGroup.add(rightArm);
    root.userData.rightArm = rightArm;
    root.userData.drill = drillGroup; // アニメーションで超高速回転！

    // 4. 左腕: 6連ヘビーガトリング砲 (gatling)
    const leftArm = new THREE.Group();
    leftArm.position.set(-1.55, 0.15, 0.35);

    const lShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), rustArmorMat);
    leftArm.add(lShoulder);

    const gatlingGroup = new THREE.Group();
    gatlingGroup.position.set(-0.1, -0.2, 0.6);
    gatlingGroup.rotation.x = Math.PI / 2;

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 8), drillMat);
      barrel.position.set(Math.cos(angle) * 0.22, 0.4, Math.sin(angle) * 0.22);
      gatlingGroup.add(barrel);
    }
    const centerAxis = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2, 8), steelMat);
    centerAxis.position.y = 0.4;
    gatlingGroup.add(centerAxis);

    leftArm.add(gatlingGroup);
    bodyGroup.add(leftArm);
    root.userData.leftArm = leftArm;
    root.userData.gatling = gatlingGroup; // アニメーションで回転

    // 5. 頑強な4脚キャタピラ脚 (4 Legs)
    const legs = [];
    const legCoords = [
      { x: -1.15, z: 0.75, name: "fl" },
      { x: 1.15, z: 0.75, name: "fr" },
      { x: -1.25, z: -0.75, name: "rl" },
      { x: 1.25, z: -0.75, name: "rr" }
    ];
    legCoords.forEach((coord) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(coord.x, -0.65, coord.z);

      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.75, 8), steelMat);
      upper.position.y = -0.3;
      legGroup.add(upper);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.75), rustArmorMat);
      foot.position.set(0, -0.7, 0.1);
      legGroup.add(foot);

      bodyGroup.add(legGroup);
      legs.push(legGroup);
    });
    root.userData.legs = legs;

    root.add(bodyGroup);
    root.userData.body = bodyGroup;
    return root;
  }

  /**
   * WAVE 2: 紅蓮竜 フレイム・ワイバーン
   * 4枚の巨大な羽ばたき翼、長い蛇腹の首と牙の生えた開閉顎、うねる棘尻尾
   */
  buildFlameWyvernBoss() {
    const root = new THREE.Group();
    root.userData = { bossType: 2 };

    const dragonScaleMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.45, metalness: 0.3 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.3, metalness: 0.6 });
    const fireWingMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, side: THREE.DoubleSide });
    const eyeGoldMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    const fireCoreMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });

    // 1. 流線型のドラゴントルソ
    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, 1.35, 0);

    const torso = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 1), dragonScaleMat);
    torso.scale.set(0.9, 1.25, 1.35);
    torso.rotation.x = 0.3;
    torso.castShadow = true;
    bodyGroup.add(torso);

    // 胸の燃える竜玉コア
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.48, 1), fireCoreMat);
    core.position.set(0, 0.25, 0.85);
    bodyGroup.add(core);
    root.userData.core = core;

    // 2. 長い首 ＆ 牙のある開閉頭部
    const neckGroup = new THREE.Group();
    neckGroup.position.set(0, 0.95, 0.75);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.55, 1.1, 10), dragonScaleMat);
    neck.position.set(0, 0.35, 0.2);
    neck.rotation.x = -0.45;
    neckGroup.add(neck);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.8, 0.45);

    // 上頭部
    const upperHead = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.2, 6), dragonScaleMat);
    upperHead.rotation.x = Math.PI / 2;
    upperHead.position.set(0, 0.15, 0.35);
    headGroup.add(upperHead);

    // 開閉する下顎 (jaw)
    const jawGroup = new THREE.Group();
    jawGroup.position.set(0, -0.08, 0.1);
    const jawMesh = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.1, 6), hornMat);
    jawMesh.rotation.x = Math.PI / 2;
    jawMesh.position.set(0, -0.1, 0.4);
    jawGroup.add(jawMesh);
    headGroup.add(jawGroup);
    root.userData.dragonJaw = jawGroup; // ガオーと開閉アニメーション！

    // 金色の猛竜の目
    [-1, 1].forEach((dir) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), eyeGoldMat);
      eye.position.set(dir * 0.32, 0.22, 0.35);
      headGroup.add(eye);

      // 後頭部の巨大な2本角
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.25, 8), hornMat);
      horn.position.set(dir * 0.35, 0.6, -0.35);
      horn.rotation.x = -0.65;
      horn.rotation.z = -dir * 0.45;
      headGroup.add(horn);
    });

    neckGroup.add(headGroup);
    bodyGroup.add(neckGroup);
    root.userData.head = headGroup;
    root.userData.neck = neckGroup;

    // 3. 巨大な4枚の羽ばたき皮膜翼 (4 Wings)
    const wings = [];
    [-1, 1].forEach((side) => {
      // 主翼（上）
      const mainWingGroup = new THREE.Group();
      mainWingGroup.position.set(side * 0.75, 0.7, -0.15);

      const armBone = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.6, 8), hornMat);
      armBone.rotation.z = -side * Math.PI / 3;
      armBone.position.set(side * 0.7, 0.35, 0);
      mainWingGroup.add(armBone);

      const membraneGeo = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 0, 0,
        side * 1.5, 0.8, -0.2,
        side * 2.2, 0.1, -0.6,
        0, 0, 0,
        side * 2.2, 0.1, -0.6,
        side * 1.2, -0.8, -0.5
      ]);
      membraneGeo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
      membraneGeo.computeVertexNormals();
      const membrane = new THREE.Mesh(membraneGeo, fireWingMat);
      mainWingGroup.add(membrane);

      bodyGroup.add(mainWingGroup);
      wings.push(mainWingGroup);

      // 副翼（下）
      const subWingGroup = new THREE.Group();
      subWingGroup.position.set(side * 0.65, 0.1, -0.4);
      const subBone = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.1, 8), hornMat);
      subBone.rotation.z = -side * Math.PI / 2.5;
      subBone.position.set(side * 0.45, -0.2, 0);
      subWingGroup.add(subBone);
      bodyGroup.add(subWingGroup);
      wings.push(subWingGroup);
    });
    root.userData.wings = wings; // アニメーションでバサバサ大きく羽ばたく！

    // 4. トゲのある長い蛇腹尻尾 (tail)
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, -0.4, -0.9);

    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Mesh(new THREE.ConeGeometry(0.3 - i * 0.05, 0.65, 8), dragonScaleMat);
      seg.rotation.x = -Math.PI / 3;
      seg.position.set(0, -i * 0.35, -i * 0.45);
      tailGroup.add(seg);

      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 6), hornMat);
      spike.position.set(0, -i * 0.35 + 0.2, -i * 0.45);
      tailGroup.add(spike);
    }
    bodyGroup.add(tailGroup);
    root.userData.tail = tailGroup;

    root.add(bodyGroup);
    root.userData.body = bodyGroup;
    return root;
  }

  /**
   * WAVE 3: 次元皇帝 アストラル・コア
   * 二重逆回転アストラルリング、背後に展開する6本の浮遊光剣、3D公転する4機の衛星ビット
   */
  buildAstralEmperorBoss() {
    const root = new THREE.Group();
    root.userData = { bossType: 3 };

    const astralDarkMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.2, metalness: 0.95 });
    const goldArmorMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.25, metalness: 0.85 });
    const bladeCyanMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const corePurpleMat = new THREE.MeshBasicMaterial({ color: 0xcc00ff });

    // 1. 浮遊皇帝胴体＆マント
    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, 1.45, 0);

    const torso = new THREE.Mesh(new THREE.OctahedronGeometry(1.0, 1), astralDarkMat);
    torso.scale.set(0.85, 1.35, 0.7);
    torso.castShadow = true;
    bodyGroup.add(torso);

    // 黄金の胸当て＆肩当て
    const breastplate = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.75, 0.3), goldArmorMat);
    breastplate.position.set(0, 0.15, 0.45);
    bodyGroup.add(breastplate);

    [-1, 1].forEach((dir) => {
      const pouldron = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.1, 5), goldArmorMat);
      pouldron.position.set(dir * 1.25, 0.55, 0);
      pouldron.rotation.z = -dir * 0.7;
      bodyGroup.add(pouldron);
    });

    // 異次元の瞳コア (ブラックホール＆プラズマ)
    const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), corePurpleMat);
    core.position.set(0, 0.15, 0.62);
    bodyGroup.add(core);
    root.userData.core = core;

    // 2. 皇帝の頭部（幾何学王冠＋冷酷なバイザー）
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.15, 0.1);

    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.8), astralDarkMat);
    headGroup.add(headMesh);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.18, 0.2), bladeCyanMat);
    visor.position.set(0, 0.05, 0.38);
    headGroup.add(visor);

    // 尖った黄金王冠
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.45, 0.65, 6), goldArmorMat);
    crown.position.set(0, 0.65, 0);
    headGroup.add(crown);

    bodyGroup.add(headGroup);
    root.userData.head = headGroup;

    // 3. 背後に扇状展開する6本の浮遊光剣 (swords)
    const swords = [];
    const swordAngles = [-1.1, -0.65, -0.22, 0.22, 0.65, 1.1];
    swordAngles.forEach((ang, idx) => {
      const swordGroup = new THREE.Group();
      swordGroup.position.set(Math.sin(ang) * 1.7, 0.6 + Math.cos(ang) * 0.5, -0.65);
      swordGroup.rotation.z = -ang * 0.85;

      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.5, 0.06), bladeCyanMat);
      blade.position.y = 0.5;
      swordGroup.add(blade);

      const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.1), goldArmorMat);
      hilt.position.y = -0.25;
      swordGroup.add(hilt);

      bodyGroup.add(swordGroup);
      swords.push(swordGroup);
    });
    root.userData.swords = swords; // アニメーションで独立浮遊スイング！

    // 4. 周囲を3D公転する4機の衛星レーザービット (bits)
    const bits = [];
    for (let i = 0; i < 4; i++) {
      const bitGroup = new THREE.Group();
      const bitMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), goldArmorMat);
      bitGroup.add(bitMesh);
      const bitLight = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), bladeCyanMat);
      bitGroup.add(bitLight);

      root.add(bitGroup);
      bits.push(bitGroup);
    }
    root.userData.bits = bits; // 3D軌道で公転！

    // 5. 二重逆回転アストラルリング (innerRing, outerRing)
    const outerRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.1, 0.06, 8, 36),
      goldArmorMat
    );
    outerRing.position.set(0, 1.45, -0.2);
    root.add(outerRing);
    root.userData.outerRing = outerRing;

    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.65, 0.05, 8, 28),
      bladeCyanMat
    );
    innerRing.position.set(0, 1.45, -0.2);
    innerRing.rotation.x = Math.PI / 4;
    root.add(innerRing);
    root.userData.innerRing = innerRing;

    root.add(bodyGroup);
    root.userData.body = bodyGroup;
    return root;
  }
}

window.VoxelCharacterManager = VoxelCharacterManager;

