/**
 * Three.js 3D Scene Manager for EIKEN 3D
 * Handles the 3D runner course, volumetric voxel character, dynamic camera,
 * cyber cityscape scenery, holographic gates, and particle systems.
 */

class Scene3DManager {
  constructor(containerEl) {
    this.container = containerEl;
    this.voxelManager = new VoxelCharacterManager();

    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // キャラクター
    this.playerGroup = new THREE.Group();
    this.currentCharModel = null;
    this.playerShadow = null;
    this.targetLaneX = -1.6;
    this.currentLaneX = -1.6;
    this.charAnimTime = 0;
    this.isJumping = false;
    this.jumpProgress = 0;

    // ホーム画面用 3D浮遊プラットフォーム台座 & 3Dバトル用オブジェクト
    this.homePedestal = null;
    this.bossGroup = new THREE.Group();
    this.currentBossModel = null;
    this.battleMagicCircle = null;
    this.isBattleAnim = false;

    // コース・ワールド
    this.roadSegments = [];
    this.cityBuildings = [];
    this.overheadRings = [];
    this.runDustParticles = null;
    this.dustParticleIdx = 0;
    this.sparkleParticles = null;
    this.gates = [];

    // 状態
    this.mode = "home"; // 'title', 'home', 'dash'
    this.baseRoadSpeed = 22;
    this.roadSpeed = 22;
    this.gateSpeed = 3.6;
    this.gateWaitMode = true;
    this.gateFastForward = false;
    this.lastFrameTime = performance.now();
    this.runDistance = 0;

    // ダイナミックカメラ
    this.cameraTargetPos = new THREE.Vector3(0, 4.0, 7.5);
    this.cameraTargetLook = new THREE.Vector3(0, 1.4, -10);
    this.cameraCurrentLook = new THREE.Vector3(0, 1.4, -10);
    this.cameraRoll = 0;

    // ホーム画面ドラッグ回転＆なでなで
    this.homeRotationY = 0;
    this.isDraggingHome = false;
    this.isEating = false;
    this.lastMouseX = 0;
    this.isPetting = false;
    this.petSwayX = 0;
    this.lastPetSoundTime = 0;
    this.floatingHearts = [];
    this.onPetCallback = null;
    this.onPetEndCallback = null;

    // コールバック
    this.onGatePassed = null;
    this.onGateStatusUpdate = null;

    this.initThree();
    this.setupLights();
    this.setupWorldEnvironment();
    this.setupRoad();
    this.setupScenery();
    this.setupHomePedestal();
    this.setupParticles();
    this.bindEvents();
    this.animate();
  }

  initThree() {
    const width = this.container.clientWidth || 360;
    const height = this.container.clientHeight || 640;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090d1a);
    this.scene.fog = new THREE.FogExp2(0x090d1a, 0.013);

    this.aspect = width / height;
    const fov = this.aspect < 0.8 ? 64 : 56;
    this.camera = new THREE.PerspectiveCamera(fov, this.aspect, 0.1, 240);
    this.camera.position.copy(this.cameraTargetPos);
    this.camera.lookAt(this.cameraTargetLook);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // キャラクターグループ
    this.scene.add(this.playerGroup);

    // 足元のリアルなドロップシャドウ円盤
    const shadowGeo = new THREE.PlaneGeometry(1.6, 1.6);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });
    this.playerShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.playerShadow.rotation.x = -Math.PI / 2;
    this.playerShadow.position.y = 0.04;
    this.playerGroup.add(this.playerShadow);
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.1);
    dirLight.position.set(10, 24, 14);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -16;
    dirLight.shadow.camera.right = 16;
    dirLight.shadow.camera.top = 16;
    dirLight.shadow.camera.bottom = -16;
    this.scene.add(dirLight);

    // コースを照らすサイバーネオンライト（青＆マゼンタ）
    const bluePoint = new THREE.PointLight(0x00d2ff, 1.8, 40);
    bluePoint.position.set(-8, 5, 2);
    this.scene.add(bluePoint);

    const pinkPoint = new THREE.PointLight(0xff0088, 1.8, 40);
    pinkPoint.position.set(8, 5, 2);
    this.scene.add(pinkPoint);
  }

  setupWorldEnvironment() {
    // 地平線のサイバーグリッド床（遠景）
    const gridHelper = new THREE.GridHelper(260, 40, 0x00d2ff, 0x142040);
    gridHelper.position.set(0, -0.05, -70);
    this.scene.add(gridHelper);

    // 遠景のサイバーマウンテン・地平線シルエット
    const mountainGroup = new THREE.Group();
    const mtnMat = new THREE.MeshBasicMaterial({ color: 0x0f1832 });
    for (let i = -6; i <= 6; i++) {
      const h = 25 + Math.abs(Math.sin(i * 1.7)) * 25;
      const w = 30 + Math.random() * 15;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(w, h, 4), mtnMat);
      cone.position.set(i * 22, h / 2 - 2, -180);
      cone.rotation.y = Math.PI / 4;
      mountainGroup.add(cone);
    }
    this.scene.add(mountainGroup);
  }

  setupRoad() {
    // 道路タイル（幅 8.4、長さ 45）を4枚並べて無限ループスクロール
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x141b2e,
      roughness: 0.65,
      metalness: 0.25
    });

    const centerLineMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const chevronMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff, transparent: true, opacity: 0.75 });

    for (let i = 0; i < 4; i++) {
      const segGroup = new THREE.Group();

      // アスファルト床面
      const geom = new THREE.PlaneGeometry(8.4, 45);
      const mesh = new THREE.Mesh(geom, roadMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.receiveShadow = true;
      segGroup.add(mesh);

      // 中央の破線
      for (let d = -20; d <= 20; d += 6) {
        const lineGeom = new THREE.PlaneGeometry(0.32, 3.2);
        const lineMesh = new THREE.Mesh(lineGeom, centerLineMat);
        lineMesh.rotation.x = -Math.PI / 2;
        lineMesh.position.set(0, 0.02, d);
        segGroup.add(lineMesh);
      }

      // レーン進行シェブロン矢印（>>>）
      for (let d = -16; d <= 16; d += 14) {
        [-1.6, 1.6].forEach((lx) => {
          const chevGeom = new THREE.ConeGeometry(0.55, 1.1, 3);
          const chevMesh = new THREE.Mesh(chevGeom, chevronMat);
          chevMesh.rotation.x = -Math.PI / 2;
          chevMesh.rotation.z = Math.PI;
          chevMesh.position.set(lx, 0.02, d);
          segGroup.add(chevMesh);
        });
      }

      // 左右の光るサイドレール
      const railGeom = new THREE.BoxGeometry(0.38, 0.45, 45);
      const railMatL = new THREE.MeshBasicMaterial({ color: 0x00e1ff });
      const railMatR = new THREE.MeshBasicMaterial({ color: 0xff1493 });

      const railL = new THREE.Mesh(railGeom, railMatL);
      railL.position.set(-4.3, 0.22, 0);
      segGroup.add(railL);

      const railR = new THREE.Mesh(railGeom, railMatR);
      railR.position.set(4.3, 0.22, 0);
      segGroup.add(railR);

      // 街路灯ポール（等間隔）
      for (let d = -18; d <= 18; d += 15) {
        const poleGeom = new THREE.CylinderGeometry(0.08, 0.08, 3.8, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, metalness: 0.8 });

        const lampGeom = new THREE.BoxGeometry(0.5, 0.2, 0.5);
        const lampMatL = new THREE.MeshBasicMaterial({ color: 0x00d2ff });
        const lampMatR = new THREE.MeshBasicMaterial({ color: 0xff0088 });

        const pL = new THREE.Mesh(poleGeom, poleMat);
        pL.position.set(-4.8, 1.9, d);
        const headL = new THREE.Mesh(lampGeom, lampMatL);
        headL.position.set(0.2, 1.9, 0);
        pL.add(headL);
        segGroup.add(pL);

        const pR = new THREE.Mesh(poleGeom, poleMat);
        pR.position.set(4.8, 1.9, d);
        const headR = new THREE.Mesh(lampGeom, lampMatR);
        headR.position.set(-0.2, 1.9, 0);
        pR.add(headR);
        segGroup.add(pR);
      }

      segGroup.position.z = -i * 45;
      this.roadSegments.push(segGroup);
      this.scene.add(segGroup);
    }
  }

  setupScenery() {
    // 道路両脇を高速で流れ去るサイバービル群
    const bldgGroup = new THREE.Group();
    const bldgMat = new THREE.MeshStandardMaterial({
      color: 0x162038,
      roughness: 0.4,
      metalness: 0.5
    });
    const winMatCyan = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const winMatMagenta = new THREE.MeshBasicMaterial({ color: 0xff007f });
    const winMatYellow = new THREE.MeshBasicMaterial({ color: 0xffd700 });

    for (let i = 0; i < 24; i++) {
      const side = (i % 2 === 0) ? -1 : 1;
      const posX = side * (9 + Math.random() * 12);
      const posZ = -i * 10;
      const w = 4 + Math.random() * 4;
      const d = 5 + Math.random() * 5;
      const h = 12 + Math.random() * 26;

      const bldgMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bldgMat);
      bldgMesh.position.set(posX, h / 2, posZ);

      // ビルの光る窓ライン
      const stripeGeom = new THREE.BoxGeometry(w + 0.1, 0.4, d + 0.1);
      const sMat = (i % 3 === 0) ? winMatCyan : ((i % 3 === 1) ? winMatMagenta : winMatYellow);
      for (let y = 3; y < h - 2; y += 4 + Math.random() * 3) {
        const stripe = new THREE.Mesh(stripeGeom, sMat);
        stripe.position.set(0, y - h / 2, 0);
        bldgMesh.add(stripe);
      }

      bldgGroup.add(bldgMesh);
      this.cityBuildings.push(bldgMesh);
    }
    this.scene.add(bldgGroup);

    // コース上空をくぐる光のトーラスリング（ネオンアーチ）
    for (let i = 0; i < 4; i++) {
      const ringGeom = new THREE.TorusGeometry(5.2, 0.16, 8, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: (i % 2 === 0) ? 0x00d2ff : 0xff0088,
        wireframe: false
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.set(0, 3.8, -i * 45 - 20);
      this.overheadRings.push(ring);
      this.scene.add(ring);
    }
  }

  setupHomePedestal() {
    // ホーム画面用：青く光る六角形の浮遊クリスタル台座
    this.homePedestal = new THREE.Group();

    // 六角形ベース
    const baseGeo = new THREE.CylinderGeometry(2.4, 2.7, 0.45, 6);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x14244a,
      roughness: 0.3,
      metalness: 0.7,
      emissive: 0x003366,
      emissiveIntensity: 0.4
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.22;
    this.homePedestal.add(baseMesh);

    // 外周ネオンリング
    const ringGeo = new THREE.TorusGeometry(2.65, 0.08, 6, 6);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.45;
    this.homePedestal.add(ringMesh);

    // 台座下部の反重力光コーン
    const glowGeo = new THREE.CylinderGeometry(2.4, 0.2, 1.2, 16, 1, true);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.y = -0.55;
    this.homePedestal.add(glowMesh);

    this.homePedestal.position.set(0, 0.4, 0);
    this.scene.add(this.homePedestal);

    // 3Dボスバトル用：ボスグループ＆魔法陣アリーナ
    this.bossGroup.visible = false;
    this.scene.add(this.bossGroup);

    this.battleMagicCircle = new THREE.Group();
    const outerRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.4, 0.08, 8, 36),
      new THREE.MeshBasicMaterial({ color: 0xff3366 })
    );
    outerRing.rotation.x = Math.PI / 2;
    this.battleMagicCircle.add(outerRing);

    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.1, 0.06, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x00d2ff })
    );
    innerRing.rotation.x = Math.PI / 2;
    this.battleMagicCircle.add(innerRing);

    this.battleMagicCircle.position.set(0, 1.65, -0.6);
    this.battleMagicCircle.visible = false;
    this.scene.add(this.battleMagicCircle);
  }

  setupParticles() {
    // 1. 走る足元のダスト・光の粒子（プール）
    const dustCount = 60;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i++) dustPos[i] = -999;
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      size: 0.32,
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8
    });
    this.runDustParticles = new THREE.Points(dustGeo, dustMat);
    this.runDustParticles.userData = {
      life: new Float32Array(dustCount),
      vels: Array.from({ length: dustCount }, () => new THREE.Vector3())
    };
    this.scene.add(this.runDustParticles);

    // 2. 正解・ゲート通過時のスターバースト粒子
    const pCount = 90;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(pCount * 3);
    const colors = new Float32Array(pCount * 3);
    const velocities = [];

    const pColor = new THREE.Color();
    for (let i = 0; i < pCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;

      pColor.setHSL(Math.random(), 0.95, 0.65);
      colors[i * 3] = pColor.r;
      colors[i * 3 + 1] = pColor.g;
      colors[i * 3 + 2] = pColor.b;

      velocities.push(new THREE.Vector3(0, 0, 0));
    }

    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.55,
      vertexColors: true,
      transparent: true,
      opacity: 0.95
    });

    this.sparkleParticles = new THREE.Points(geom, mat);
    this.sparkleParticles.userData = { velocities, activeTime: 0 };
    this.scene.add(this.sparkleParticles);
  }

  emitRunDust(x, y, z) {
    if (!this.runDustParticles) return;
    const pos = this.runDustParticles.geometry.attributes.position.array;
    const life = this.runDustParticles.userData.life;
    const vels = this.runDustParticles.userData.vels;

    const idx = this.dustParticleIdx;
    this.dustParticleIdx = (this.dustParticleIdx + 1) % life.length;

    pos[idx * 3] = x + (Math.random() - 0.5) * 0.4;
    pos[idx * 3 + 1] = y + 0.08;
    pos[idx * 3 + 2] = z + (Math.random() - 0.5) * 0.3;

    life[idx] = 0.5; // 生存時間0.5秒
    vels[idx].set(
      (Math.random() - 0.5) * 1.5,
      0.8 + Math.random() * 1.2,
      6.0 + Math.random() * 4.0 // 後方に吹き飛ぶ
    );
    this.runDustParticles.geometry.attributes.position.needsUpdate = true;
  }

  triggerCorrectParticles(x, y, z) {
    const pos = this.sparkleParticles.geometry.attributes.position.array;
    const vels = this.sparkleParticles.userData.velocities;
    const count = pos.length / 3;

    for (let i = 0; i < count; i++) {
      pos[i * 3] = x + (Math.random() - 0.5) * 1.6;
      pos[i * 3 + 1] = y + Math.random() * 1.4;
      pos[i * 3 + 2] = z + (Math.random() - 0.5) * 1.6;

      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 9;
      vels[i].set(
        Math.cos(angle) * speed,
        4 + Math.random() * 8,
        Math.sin(angle) * speed
      );
    }
    this.sparkleParticles.geometry.attributes.position.needsUpdate = true;
    this.sparkleParticles.userData.activeTime = 1.2;
  }

  async loadPlayerCharacter(partnerId, stage) {
    try {
      const charGroup = await this.voxelManager.loadVoxelModel("", partnerId, stage);
      if (this.currentCharModel) {
        this.playerGroup.remove(this.currentCharModel);
      }
      this.currentCharModel = charGroup;
      this.playerGroup.add(charGroup);
      this.playerGroup.visible = (this.mode !== "title");
    } catch (e) {
      console.error("Failed to load 3D character:", e);
    }
  }

  async updateCharacterModel(partnerId, stage) {
    return await this.loadPlayerCharacter(partnerId, stage);
  }


  setLane(laneIndex) {
    // 0: 左レーン (-1.6), 1: 右レーン (1.6)
    this.targetLaneX = laneIndex === 0 ? -1.6 : 1.6;
  }

  setMode(newMode) {
    return this.switchMode(newMode);
  }

  switchMode(newMode) {
    this.mode = newMode;
    this.isBattleAnim = false;
    this.isEating = false;

    if (newMode === "title") {
      // タイトル画面：低空疾走するサイバーカメラデモ
      this.playerGroup.visible = false;
      this.bossGroup.visible = false;
      if (this.battleMagicCircle) this.battleMagicCircle.visible = false;
      if (this.homePedestal) this.homePedestal.visible = false;
      this.cameraTargetPos.set(0, 2.8, 12);
      this.cameraTargetLook.set(0, 1.8, -18);
      this.clearGates();
    } else if (newMode === "home") {
      // ホーム待機：上下パネルの間の開口部に頭〜体〜足先〜台座が100%美しく収まるアングル
      this.playerGroup.visible = true;
      this.bossGroup.visible = false;
      if (this.battleMagicCircle) this.battleMagicCircle.visible = false;
      this.playerGroup.scale.set(0.42, 0.42, 0.42);
      if (this.homePedestal) {
        this.homePedestal.visible = true;
        this.homePedestal.scale.set(0.42, 0.42, 0.42);
        this.homePedestal.position.set(0, 1.10, 0);
      }

      this.cameraTargetPos.set(0, 1.85, 5.4);
      this.cameraTargetLook.set(0, 0.63, 0);
      this.camera.position.set(0, 1.85, 5.4);
      this.camera.lookAt(0, 0.63, 0);
      this.playerGroup.position.set(0, 1.30, 0);
      this.playerGroup.rotation.set(0, 0, 0);
      this.targetLaneX = 0;
      this.currentLaneX = 0;
      this.clearGates();
    } else if (newMode === "dash") {
      // 3Dダッシュ：走る姿が画面中央で全身見えるカメラ（ランナー適正サイズにスケールダウン）
      this.playerGroup.visible = true;
      this.bossGroup.visible = false;
      if (this.battleMagicCircle) this.battleMagicCircle.visible = false;
      if (this.homePedestal) this.homePedestal.visible = false;

      this.playerGroup.scale.set(0.58, 0.58, 0.58);
      this.cameraTargetPos.set(0, 3.5, 8.2);
      this.cameraTargetLook.set(0, 1.3, -14);
      this.playerGroup.position.set(-1.6, 0.05, 0.8);
      this.playerGroup.rotation.set(0, 0, 0);
      this.setLane(0);
      this.clearGates();
    } else if (newMode === "battle") {
      // 3Dボスバトル：手前左に相棒、奥右に巨大3Dボスが対峙するアリーナ構図
      this.playerGroup.visible = true;
      this.bossGroup.visible = true;
      if (this.homePedestal) this.homePedestal.visible = false;
      if (this.battleMagicCircle) {
        this.battleMagicCircle.visible = true;
        this.battleMagicCircle.position.set(0, 1.65, -0.6);
      }

      this.playerGroup.scale.set(0.68, 0.68, 0.68);
      this.playerGroup.position.set(-1.35, 1.75, 1.1);
      this.playerGroup.rotation.set(0, Math.PI * 0.78, 0);

      this.bossGroup.position.set(1.15, 1.85, -2.2);
      this.bossGroup.rotation.set(0, -0.42, 0);
      this.bossGroup.scale.set(0.95, 0.95, 0.95);

      this.cameraTargetPos.set(0, 3.3, 6.2);
      this.cameraTargetLook.set(0, 1.65, -1.0);
      this.camera.position.copy(this.cameraTargetPos);
      this.camera.lookAt(this.cameraTargetLook);
      this.clearGates();
    }
  }

  /**
   * 3Dボスモンスターをバトルフィールドに召喚
   */
  spawnBoss(bossType = 1) {
    if (this.currentBossModel) {
      this.bossGroup.remove(this.currentBossModel);
      this.currentBossModel = null;
    }
    const bossModel = this.voxelManager.build3DBoss(bossType);
    this.currentBossModel = bossModel;
    this.bossGroup.add(bossModel);
    this.bossGroup.visible = true;
    this.bossGroup.position.set(1.15, 1.85, -2.2);
    this.bossGroup.rotation.set(0, -0.42, 0);

    // 召喚スケールイン＆パーティクル演出
    this.bossGroup.scale.set(0.1, 0.1, 0.1);
    this.triggerCorrectParticles(1.15, 2.8, -2.2);
    let t = 0;
    const animSpawn = () => {
      t += 0.08;
      const s = Math.min(0.95, t * 0.95);
      this.bossGroup.scale.set(s, s, s);
      if (t < 1.0 && this.mode === "battle") {
        requestAnimationFrame(animSpawn);
      }
    };
    animSpawn();
  }

  /**
   * 相棒の3D飛び込みダイナミック攻撃（高速ダッシュ接近 → 空中スピン至近距離バースト → バックフリップ着地）
   */
  playPlayerMagicAttack(isCritical = false, onHit = null) {
    this.isBattleAnim = true;

    const startPos = new THREE.Vector3(-1.35, 1.75, 1.1);
    const bossAtkPos = new THREE.Vector3(0.5, 2.35, -1.4); // ボスの眼前至近距離
    const camBasePos = this.cameraTargetPos.clone();
    const camZoomPos = new THREE.Vector3(0.2, 2.7, 3.0); // 攻撃時のダイナミックズームカメラ

    let timer = 0;
    let hitTriggered = false;

    // 魔法オーラブレードエフェクト
    const auraOrb = new THREE.Mesh(
      new THREE.SphereGeometry(isCritical ? 0.45 : 0.32, 16, 16),
      new THREE.MeshBasicMaterial({ color: isCritical ? 0xffd700 : 0x00ffff })
    );
    auraOrb.position.set(0, 0.2, 0.6);
    this.playerGroup.add(auraOrb);

    const animAttack = () => {
      timer += 0.038;

      if (timer <= 0.32) {
        // Phase 1: 相棒がボスの眼前へ3D空間を猛スピード飛び込み！
        const p = timer / 0.32;
        const jumpArc = Math.sin(p * Math.PI) * 0.9;
        this.playerGroup.position.lerpVectors(startPos, bossAtkPos, p);
        this.playerGroup.position.y += jumpArc;
        this.playerGroup.rotation.y = Math.PI * 0.78 + p * 0.6;

        // カメラも迫力のズーム追従
        this.camera.position.lerp(camZoomPos, 0.2);

        if (this.currentCharModel) {
          this.currentCharModel.rotation.y += 0.4;
        }

      } else if (!hitTriggered) {
        // Phase 2: ボス眼前で至近距離大爆発バースト！
        hitTriggered = true;
        this.playerGroup.remove(auraOrb);

        // ボスに大爆発パーティクル＋画面激震シェイク
        this.triggerCorrectParticles(1.15, 2.8, -2.2);
        this.triggerCorrectParticles(0.5, 2.4, -1.6);
        this.camera.position.x += (Math.random() - 0.5) * 0.5;
        this.camera.position.y += (Math.random() - 0.5) * 0.5;

        if (onHit) onHit();

      } else if (timer <= 0.62) {
        // Phase 3: ボスが吹き飛ぶ ＆ 相棒が空中360度大スピン
        const recoilP = (timer - 0.32) / 0.3;
        const recoil = Math.sin(recoilP * Math.PI);

        // ボスの激しいノックバック＆のけぞり
        this.bossGroup.position.z = -2.2 - recoil * 1.1;
        this.bossGroup.position.x = 1.15 + (Math.random() - 0.5) * 0.35;
        this.bossGroup.rotation.x = -recoil * 0.5;

        if (this.currentCharModel) {
          this.currentCharModel.rotation.y += 0.6;
        }

      } else if (timer <= 0.92) {
        // Phase 4: 相棒が華麗なバックフリップ（後方宙返り）で元の定位置へ着地
        const landP = (timer - 0.62) / 0.3;
        const backArc = Math.sin(landP * Math.PI) * 0.7;
        this.playerGroup.position.lerpVectors(bossAtkPos, startPos, landP);
        this.playerGroup.position.y += backArc;
        this.playerGroup.rotation.y = (Math.PI * 0.78 + 0.6) * (1 - landP) + Math.PI * 0.78 * landP;

        this.camera.position.lerp(camBasePos, 0.18);

      } else {
        // 完了
        if (auraOrb.parent) this.playerGroup.remove(auraOrb);
        this.playerGroup.position.copy(startPos);
        this.playerGroup.rotation.set(0, Math.PI * 0.78, 0);
        if (this.currentCharModel) this.currentCharModel.rotation.set(0, 0, 0);
        this.bossGroup.position.set(1.15, 1.85, -2.2);
        this.bossGroup.rotation.set(0, -0.42, 0);
        this.isBattleAnim = false;
        return;
      }

      if (this.mode === "battle") {
        requestAnimationFrame(animAttack);
      } else {
        if (auraOrb.parent) this.playerGroup.remove(auraOrb);
        this.isBattleAnim = false;
      }
    };
    animAttack();
  }

  /**
   * 3Dボスのド迫力手前巨大突進アニメーション（画面手前へ迫り出してなぎ払い → 画面激震＆相棒ダメージ）
   */
  playBossAttack(onHit = null) {
    this.isBattleAnim = true;

    const bossStartPos = new THREE.Vector3(1.15, 1.85, -2.2);
    const bossChargePos = new THREE.Vector3(-0.3, 1.95, 0.2); // 画面手前の相棒目前まで巨大突進！
    let timer = 0;
    let hitTriggered = false;

    const animBossAtk = () => {
      timer += 0.038;

      if (timer <= 0.34) {
        // Phase 1: ボスが画面手前へ巨大突進！
        const p = timer / 0.34;
        this.bossGroup.position.lerpVectors(bossStartPos, bossChargePos, p);
        this.bossGroup.rotation.x = Math.sin(p * Math.PI) * 0.35;
        this.bossGroup.rotation.y = -0.42 + Math.sin(p * Math.PI) * 0.3;

      } else if (!hitTriggered) {
        // Phase 2: 直撃！大衝撃波＆画面激震
        hitTriggered = true;
        this.triggerCorrectParticles(-1.35, 2.1, 1.1);

        // 画面シェイク
        this.camera.position.x += (Math.random() - 0.5) * 0.6;
        this.camera.position.y += (Math.random() - 0.5) * 0.6;

        if (onHit) onHit();

      } else if (timer <= 0.65) {
        // Phase 3: 相棒が激しく吹き飛ぶ＆ボスが決めポーズ
        const flinchP = (timer - 0.34) / 0.31;
        const flinch = Math.sin(flinchP * Math.PI);
        this.playerGroup.position.z = 1.1 + flinch * 0.8;
        this.playerGroup.position.x = -1.35 - flinch * 0.4;
        this.playerGroup.rotation.z = flinch * 0.45;

      } else if (timer <= 0.95) {
        // Phase 4: ボスが定位置へバック＆相棒が体勢を立て直す
        const returnP = (timer - 0.65) / 0.3;
        this.bossGroup.position.lerpVectors(bossChargePos, bossStartPos, returnP);
        this.bossGroup.rotation.set(0, -0.42, 0);

        this.playerGroup.position.set(-1.35, 1.75, 1.1);
        this.playerGroup.rotation.set(0, Math.PI * 0.78, 0);

      } else {
        this.bossGroup.position.copy(bossStartPos);
        this.bossGroup.rotation.set(0, -0.42, 0);
        this.playerGroup.position.set(-1.35, 1.75, 1.1);
        this.playerGroup.rotation.set(0, Math.PI * 0.78, 0);
        this.isBattleAnim = false;
        return;
      }

      if (this.mode === "battle") {
        requestAnimationFrame(animBossAtk);
      } else {
        this.isBattleAnim = false;
      }
    };
    animBossAtk();
  }

  /**
   * 3Dボス撃破アニメーション（連続爆発＆回転消滅＋相棒の勝利ジャンプ）
   */
  playBossDefeat(onComplete = null) {
    this.isBattleAnim = true;
    this.jumpPlayer();
    this.triggerCorrectParticles(1.15, 3.0, -2.2);

    let timer = 0;
    const animDefeat = () => {
      timer += 0.035;
      if (this.bossGroup) {
        this.bossGroup.rotation.y += 0.35;
        this.bossGroup.position.y = 1.85 + Math.sin(timer * 20) * 0.2;
        const s = Math.max(0.01, 0.95 * (1 - timer / 1.1));
        this.bossGroup.scale.set(s, s, s);
      }

      if (Math.floor(timer * 20) % 5 === 0) {
        this.triggerCorrectParticles(
          1.15 + (Math.random() - 0.5) * 1.2,
          2.4 + Math.random() * 1.2,
          -2.2 + (Math.random() - 0.5) * 1.0
        );
      }

      if (timer < 1.15 && this.mode === "battle") {
        requestAnimationFrame(animDefeat);
      } else {
        if (this.bossGroup) this.bossGroup.visible = false;
        this.isBattleAnim = false;
        if (onComplete) onComplete();
      }
    };
    animDefeat();
  }

  /**
   * 3D食事アニメーション
   * （台座奥からトコトコ駆け寄り ＋ お皿の前でちょこんと座ってモグモグ ＋ ハート浮遊 ＋ お腹ぽんぽん ＋ くるりん大喜びジャンプ ＋ 定位置へ帰還）
   */
  playEatingAnimation(foodType, onComplete) {
    const homeEl = document.getElementById("screen-home");
    if (homeEl) homeEl.classList.add("eating-mode");

    this.isEating = true;
    this.homeRotationY = 0;
    this.playerGroup.rotation.set(0, 0, 0);

    // カメラ：ホーム画面の定位置をキープ（頭〜台座が100%収まる位置）
    this.cameraTargetPos.set(0, 1.85, 5.4);
    this.cameraTargetLook.set(0, 0.63, 0);

    // 1. 台座天面（手前）に3Dお皿を配置
    const plateMesh = this.voxelManager.build3DPlate();
    plateMesh.position.set(0, 1.30, 0.45);
    plateMesh.scale.set(0.35, 0.35, 0.35);
    this.scene.add(plateMesh);

    // 2. お皿の上に3Dフードを乗せる
    const foodMesh = this.voxelManager.build3DFood(foodType);
    foodMesh.position.set(0, 1.40, 0.45);
    foodMesh.scale.set(0.25, 0.25, 0.25);
    this.scene.add(foodMesh);

    // 3. 浮遊する3Dピンクハート
    const heartMesh = this.voxelManager.build3DHeart();
    heartMesh.position.set(0, 2.25, 0.20);
    heartMesh.scale.set(0.01, 0.01, 0.01);
    this.scene.add(heartMesh);

    // 相棒は台座奥 (0, 1.30, -0.35) からスタート
    this.playerGroup.position.set(0, 1.30, -0.35);

    let eatTimer = 0;
    let particleThrottle = 0;

    const ud = this.currentCharModel ? this.currentCharModel.userData : null;

    const animateEat = () => {
      eatTimer += 0.032;
      particleThrottle++;

      if (eatTimer < 1.3) {
        // Phase 1: ごちそう発見！台座奥からお皿の前へ1.3秒かけてトコトコ駆け寄る！
        const p = eatTimer / 1.3;
        this.playerGroup.position.set(
          0,
          1.30 + Math.abs(Math.sin(p * Math.PI * 6)) * 0.04,
          -0.35 + p * 0.53
        );

        // 口を縦にあーんと開いて喜ぶ
        if (ud && ud.mouth) {
          ud.mouth.scale.set(1.1, 0.3 + p * 0.7, 0.7);
        }

        // 手足をトコトコ走らせる（パタパタ小刻みな愛らしい歩様）
        if (ud) {
          const runPhase = Math.sin(p * Math.PI * 8);
          if (ud.leftLeg) ud.leftLeg.rotation.x = runPhase * 0.55;
          if (ud.rightLeg) ud.rightLeg.rotation.x = -runPhase * 0.55;
          if (ud.leftArm) ud.leftArm.rotation.set(-runPhase * 0.4, 0.25, 0.2);
          if (ud.rightArm) ud.rightArm.rotation.set(runPhase * 0.4, -0.25, -0.2);
          if (ud.tail) ud.tail.rotation.y = Math.sin(eatTimer * 22) * 0.4;
        }

      } else if (eatTimer < 2.9) {
        // Phase 2: お皿の前にちょこんと座ってモグモグ咀嚼！笑顔(^ ^)＋体コテンコテン＋ハート浮遊
        const chewP = (eatTimer - 1.3) / 1.6;
        this.playerGroup.position.set(0, 1.30, 0.18);

        // 足を座りポーズに
        if (ud) {
          if (ud.leftLeg) ud.leftLeg.rotation.x = -0.25;
          if (ud.rightLeg) ud.rightLeg.rotation.x = -0.25;
        }

        // ニコニコ笑顔目へ切り替え！
        if (ud && ud.happyEyes && ud.normalEyes) {
          ud.happyEyes.visible = true;
          ud.normalEyes.visible = false;
        }

        // 口をパクパク
        const chewPhase = (eatTimer - 1.3) * 16;
        if (ud && ud.mouth) {
          const chewOpen = Math.abs(Math.sin(chewPhase)) * 0.55 + 0.3;
          ud.mouth.scale.set(1.0, chewOpen, 0.6);
        }

        // 体を左右に「コテン、コテン」と愛らしく傾ける
        this.playerGroup.rotation.z = Math.sin((eatTimer - 1.3) * 6) * 0.08;

        if (ud) {
          if (ud.leftArm) ud.leftArm.rotation.set(-0.95, 0.4, 0.3);
          if (ud.rightArm) ud.rightArm.rotation.set(-0.95, -0.4, -0.3);
          if (ud.head) ud.head.rotation.x = Math.sin(chewPhase) * 0.08;
          if (ud.tail) ud.tail.rotation.y = Math.sin(eatTimer * 20) * 0.35;
        }

        // フードが口元へ持ち上げられ、少しずつ小さくなる
        foodMesh.position.set(0, 1.50 + Math.sin(chewPhase) * 0.02, 0.28);
        foodMesh.rotation.y += 0.06;
        const remScale = Math.max(0.01, 0.25 * (1 - chewP));
        foodMesh.scale.set(remScale, remScale, remScale);

        // 頭上にピンクハートがふわふわ浮かび上がる
        const heartS = Math.min(0.45, chewP * 0.9);
        heartMesh.scale.set(heartS, heartS, heartS);
        heartMesh.position.set(0, 2.25 + Math.sin(eatTimer * 5) * 0.08, 0.20);
        heartMesh.rotation.y += 0.05;

        // 咀嚼中に食べかすキラキラパーティクル
        if (particleThrottle % 4 === 0) {
          this.triggerCorrectParticles(0, 1.50, 0.28);
        }

      } else if (eatTimer < 3.7) {
        // Phase 3: ごちそうさま！お口を閉じ、両手でお腹をぽんぽん
        if (foodMesh.parent) this.scene.remove(foodMesh);

        if (ud && ud.mouth) ud.mouth.scale.set(0.6, 0.25, 0.5);
        this.playerGroup.rotation.z = 0;
        this.playerGroup.position.set(0, 1.30, 0.18);

        // お腹を両手で優しく「ぽんぽん」とさするモーション
        const rubP = (eatTimer - 2.9) * 12;
        if (ud) {
          if (ud.leftArm) ud.leftArm.rotation.set(-0.7 + Math.sin(rubP) * 0.15, 0.45, 0.2);
          if (ud.rightArm) ud.rightArm.rotation.set(-0.7 - Math.sin(rubP) * 0.15, -0.45, -0.2);
          if (ud.head) ud.head.rotation.set(-0.06, 0, 0);
        }

        // ハートがふわりと昇る
        heartMesh.position.y += 0.02;
        heartMesh.scale.multiplyScalar(0.97);

      } else if (eatTimer < 4.5) {
        // Phase 4: その場でくるりん大喜びピョンピョンジャンプ！
        const jumpP = (eatTimer - 3.7) / 0.8;
        const jumpArc = Math.sin(jumpP * Math.PI) * 0.45;
        this.playerGroup.position.y = 1.30 + jumpArc;
        this.playerGroup.position.z = 0.18;

        if (ud) {
          if (ud.leftArm) ud.leftArm.rotation.set(-2.2, 0.15, 0.35);
          if (ud.rightArm) ud.rightArm.rotation.set(-2.2, -0.15, -0.35);
          if (ud.tail) ud.tail.rotation.y = Math.sin(eatTimer * 28) * 0.5;
        }

        if (this.currentCharModel) {
          this.currentCharModel.rotation.y = jumpP * Math.PI * 2;
        }

        if (eatTimer < 3.9 && particleThrottle % 3 === 0) {
          this.triggerCorrectParticles(0, 1.70, 0.20);
        }

      } else if (eatTimer < 5.2) {
        // Phase 5: 満足して定位置 (0, 1.30, 0) へトコトコ戻る
        const retP = (eatTimer - 4.5) / 0.7;
        this.playerGroup.position.set(0, 1.30, 0.18 - retP * 0.18);

        if (this.currentCharModel) {
          this.currentCharModel.rotation.set(0, 0, 0);
        }

        if (ud) {
          const retRun = Math.sin(retP * Math.PI * 6);
          if (ud.leftLeg) ud.leftLeg.rotation.x = retRun * 0.4;
          if (ud.rightLeg) ud.rightLeg.rotation.x = -retRun * 0.4;
          if (ud.leftArm) ud.leftArm.rotation.set(-retRun * 0.3, 0.15, 0.1);
          if (ud.rightArm) ud.rightArm.rotation.set(retRun * 0.3, -0.15, -0.1);
        }

      } else {
        // Phase 6: アニメーション完了・片付け＆通常状態へ復帰
        if (plateMesh.parent) this.scene.remove(plateMesh);
        if (foodMesh.parent) this.scene.remove(foodMesh);
        if (heartMesh.parent) this.scene.remove(heartMesh);

        if (ud) {
          if (ud.mouth) ud.mouth.scale.set(0.6, 0.25, 0.5);
          if (ud.happyEyes && ud.normalEyes) {
            ud.happyEyes.visible = false;
            ud.normalEyes.visible = true;
          }
          if (ud.head) ud.head.rotation.set(0, 0, 0);
          if (ud.leftArm) ud.leftArm.rotation.set(0, 0, 0);
          if (ud.rightArm) ud.rightArm.rotation.set(0, 0, 0);
          if (ud.leftLeg) ud.leftLeg.rotation.set(0, 0, 0);
          if (ud.rightLeg) ud.rightLeg.rotation.set(0, 0, 0);
        }
        if (this.currentCharModel) this.currentCharModel.rotation.set(0, 0, 0);
        this.playerGroup.position.set(0, 1.30, 0);
        this.playerGroup.rotation.set(0, 0, 0);

        this.isEating = false;
        if (homeEl) homeEl.classList.remove("eating-mode");

        // カメラをホーム待機位置へ復帰
        this.cameraTargetPos.set(0, 1.85, 5.4);
        this.cameraTargetLook.set(0, 0.63, 0);

        if (onComplete) onComplete();
        return;
      }

      if (this.isEating) {
        requestAnimationFrame(animateEat);
      } else {
        if (plateMesh.parent) this.scene.remove(plateMesh);
        if (foodMesh.parent) this.scene.remove(foodMesh);
        if (heartMesh.parent) this.scene.remove(heartMesh);
      }
    };
    animateEat();
  }

  /**
   * レベルアップ専用3Dセレブレーション cutscene
   * 全画面シネマモード＋光柱＆スターバースト＋360度バンザイスピンジャンプ＋ホログラムバナー
   */
  playLevelUpAnimation(newLevel, onComplete) {
    const homeEl = document.getElementById("screen-home");
    if (homeEl) homeEl.classList.add("cinema-mode");

    const banner = document.getElementById("home-levelup-banner");
    const lvText = document.getElementById("levelup-level-text");
    if (lvText) lvText.textContent = `Lv.${newLevel}`;
    if (banner) banner.classList.add("show");

    this.isEating = true; // ホーム回転を一時停止
    this.homeRotationY = 0;
    this.playerGroup.rotation.set(0, 0, 0);

    // カメラをキャラクターのセレブレーション画角へクローズアップ
    this.cameraTargetPos.set(0, 1.85, 3.4);
    this.cameraTargetLook.set(0, 1.35, 0);

    // キラキラ＆光柱パーティクルを連射
    this.triggerCorrectParticles(0, 1.35, 0);

    // キャラクターの歓喜ジャンプ
    this.jumpPlayer();

    const ud = this.currentCharModel ? this.currentCharModel.userData : null;
    let lvTimer = 0;

    const animateLevelUp = () => {
      lvTimer += 0.03;

      if (ud) {
        // 両手を高々と挙げてバンザイ！
        if (ud.leftArm) ud.leftArm.rotation.set(-2.4, 0.15, 0.4);
        if (ud.rightArm) ud.rightArm.rotation.set(-2.4, -0.15, -0.4);
        if (ud.head) ud.head.rotation.x = -0.2 + Math.sin(lvTimer * 12) * 0.08;
        if (ud.tail) ud.tail.rotation.y = Math.sin(lvTimer * 38) * 0.5;
      }

      if (Math.floor(lvTimer * 20) % 5 === 0) {
        this.triggerCorrectParticles(
          (Math.random() - 0.5) * 1.2,
          1.1 + Math.random() * 0.9,
          (Math.random() - 0.5) * 1.2
        );
      }

      if (lvTimer < 2.2) {
        requestAnimationFrame(animateLevelUp);
      } else {
        // セレブレーション完了
        if (banner) banner.classList.remove("show");
        if (homeEl) homeEl.classList.remove("cinema-mode");

        if (ud) {
          if (ud.head) ud.head.rotation.set(0, 0, 0);
          if (ud.leftArm) ud.leftArm.rotation.set(0, 0, 0);
          if (ud.rightArm) ud.rightArm.rotation.set(0, 0, 0);
        }
        this.isEating = false;

        this.cameraTargetPos.set(0, 1.85, 5.4);
        this.cameraTargetLook.set(0, 0.63, 0);

        if (onComplete) onComplete();
      }
    };
    animateLevelUp();
  }

  /**
   * 3Dテキスト看板テクスチャの生成
   */
  createTextTexture(text, isCorrectStyle = false, isGoal = false) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 190;
    const ctx = canvas.getContext("2d");

    // 背景角丸グラデーション
    const grad = ctx.createLinearGradient(0, 0, 512, 190);
    if (isGoal) {
      grad.addColorStop(0, "rgba(40, 28, 0, 0.96)");
      grad.addColorStop(1, "rgba(80, 56, 10, 0.98)");
    } else {
      grad.addColorStop(0, "rgba(16, 22, 44, 0.96)");
      grad.addColorStop(1, "rgba(26, 36, 68, 0.96)");
    }
    ctx.fillStyle = grad;
    if (ctx.roundRect) {
      ctx.roundRect(8, 8, 496, 174, 24);
    } else {
      ctx.rect(8, 8, 496, 174);
    }
    ctx.fill();

    // 枠線ネオン
    ctx.lineWidth = 8;
    ctx.strokeStyle = isGoal ? "#ffd700" : (isCorrectStyle ? "#00f0ff" : "#ff2a85");
    ctx.stroke();

    // テキスト折り返し
    let words = text.split(" ");
    let lines = [];
    let initialFontSize = isGoal ? 48 : 42;
    if (text.length > 24) initialFontSize = 32;
    else if (text.length > 15) initialFontSize = 36;

    ctx.font = `bold ${initialFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans JP', sans-serif`;

    if (words.length > 1 && ctx.measureText(text).width > 450) {
      let mid = Math.ceil(words.length / 2);
      lines = [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
      initialFontSize = Math.min(initialFontSize, 32);
    } else {
      lines = [text];
    }

    ctx.font = `bold ${initialFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans JP', sans-serif`;
    ctx.fillStyle = isGoal ? "#ffd700" : "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (lines.length === 1) {
      while (ctx.measureText(lines[0]).width > 460 && initialFontSize > 22) {
        initialFontSize -= 2;
        ctx.font = `bold ${initialFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans JP', sans-serif`;
      }
      ctx.fillText(lines[0], 256, 95);
    } else {
      ctx.fillText(lines[0], 256, 66);
      ctx.fillText(lines[1], 256, 124);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  /**
   * 3Dゲートの出現（通常ゲート or 10問目FINAL GOALゲート）
   */
  spawnGatePair(question, isGoal = false) {
    this.clearGates();
    this.gateWaitMode = true;
    this.gateFastForward = false;

    const gateGroup = new THREE.Group();
    gateGroup.position.z = -50;
    gateGroup.userData = {
      question: question,
      hasCollided: false,
      isGoal: isGoal
    };

    const lanePositions = [-1.6, 1.6];

    // ゴールゲートの場合は中央に超巨大アーチを架ける
    if (isGoal) {
      const goalArch = new THREE.Group();

      // 巨大ピラー柱
      const pMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0xaa7700
      });
      const pL = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 5.2, 16), pMat);
      pL.position.set(-3.6, 2.6, 0);
      goalArch.add(pL);

      const pR = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 5.2, 16), pMat);
      pR.position.set(3.6, 2.6, 0);
      goalArch.add(pR);

      // 上部メイン看板
      const topMat = new THREE.MeshBasicMaterial({
        map: this.createTextTexture("★ FINAL GOAL ★", false, true),
        transparent: true,
        side: THREE.DoubleSide
      });
      const topSign = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 1.5), topMat);
      topSign.position.set(0, 4.8, 0);
      goalArch.add(topSign);

      // 左右の選択肢看板
      question.lanes.forEach((lane, idx) => {
        const signTex = this.createTextTexture(lane.text, idx === 0);
        const signMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(2.8, 1.1),
          new THREE.MeshBasicMaterial({ map: signTex, transparent: true, side: THREE.DoubleSide })
        );
        signMesh.position.set(lanePositions[idx], 3.2, 0);
        goalArch.add(signMesh);

        // チェッカーフラッグカーテン
        const curtainMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(2.7, 2.8),
          new THREE.MeshBasicMaterial({
            color: idx === 0 ? 0x00d2ff : 0xffaa00,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide
          })
        );
        curtainMesh.position.set(lanePositions[idx], 1.4, 0);
        goalArch.add(curtainMesh);
      });

      gateGroup.add(goalArch);
    } else {
      // 通常2レーンゲート
      question.lanes.forEach((lane, idx) => {
        const arch = new THREE.Group();
        arch.position.x = lanePositions[idx];

        const pColor = idx === 0 ? 0x00d2ff : 0xff0066;
        const pillarMat = new THREE.MeshStandardMaterial({
          color: pColor,
          roughness: 0.3,
          metalness: 0.7,
          emissive: idx === 0 ? 0x004466 : 0x660022
        });

        const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.4, 16), pillarMat);
        pillarL.position.set(-1.35, 2.2, 0);
        arch.add(pillarL);

        const pillarR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.4, 16), pillarMat);
        pillarR.position.set(1.35, 2.2, 0);
        arch.add(pillarR);

        const topBar = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.35, 0.35), pillarMat);
        topBar.position.set(0, 4.3, 0);
        arch.add(topBar);

        // 選択肢看板
        const signTex = this.createTextTexture(lane.text, idx === 0);
        const signMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(2.7, 1.1),
          new THREE.MeshBasicMaterial({ map: signTex, transparent: true, side: THREE.DoubleSide })
        );
        signMesh.position.set(0, 3.5, 0);
        arch.add(signMesh);

        // 半透明エネルギーバリア
        const barrierMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(2.5, 3.1),
          new THREE.MeshBasicMaterial({
            color: pColor,
            transparent: true,
            opacity: 0.24,
            side: THREE.DoubleSide
          })
        );
        barrierMesh.position.set(0, 1.55, 0);
        arch.add(barrierMesh);

        gateGroup.add(arch);
      });
    }

    this.gates.push(gateGroup);
    this.scene.add(gateGroup);
  }

  setGateWait(isWait) {
    if (this.gateFastForward) return;
    this.gateWaitMode = isWait;
  }

  triggerFastPass() {
    const activeGate = this.gates.find((g) => !g.userData.hasCollided);
    if (!activeGate) return false;
    this.gateWaitMode = false;
    this.gateFastForward = true;
    return true;
  }

  disposeGate(gateGroup) {
    if (!gateGroup) return;
    gateGroup.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    });
    this.scene.remove(gateGroup);
  }

  clearGates() {
    for (const g of this.gates) {
      this.disposeGate(g);
    }
    this.gates = [];
  }

  jumpPlayer() {
    if (this.isJumping) return;
    this.isJumping = true;
    this.jumpProgress = 0;
  }

  spawnPetHeart(x = 0, y = 2.10, z = 0.2) {
    if (!this.voxelManager || !this.scene) return;
    const heart = this.voxelManager.build3DHeart();
    const ox = (Math.random() - 0.5) * 0.4;
    const oy = (Math.random() - 0.5) * 0.2;
    const oz = (Math.random() - 0.5) * 0.2;
    heart.position.set(x + ox, y + oy, z + oz);
    const s = 0.25 + Math.random() * 0.18;
    heart.scale.set(s, s, s);
    heart.userData = {
      age: 0,
      maxAge: 0.9,
      vy: 0.8 + Math.random() * 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      rotSpeed: (Math.random() - 0.5) * 3
    };
    this.scene.add(heart);
    this.floatingHearts.push(heart);
  }

  startPetting(clientX) {
    if (this.mode !== "home" || this.isEating) return;
    this.isPetting = true;
    this.isDraggingHome = true;
    this.lastMouseX = clientX;
    this.petSwayX = 0;
    this.spawnPetHeart(0, 2.10, 0.2);
    if (window.audio) {
      window.audio.unlockAudio();
      window.audio.playPet();
    }
    this.lastPetSoundTime = performance.now();
    if (this.onPetCallback) this.onPetCallback();
  }

  movePetting(clientX) {
    if (!this.isDraggingHome || this.mode !== "home" || this.isEating) return;
    const delta = clientX - this.lastMouseX;
    this.homeRotationY += delta * 0.016;
    this.petSwayX = Math.max(-1, Math.min(1, delta * 0.06));
    this.lastMouseX = clientX;

    const now = performance.now();
    if (now - this.lastPetSoundTime > 260) {
      this.spawnPetHeart(0, 2.10, 0.2);
      if (window.audio) window.audio.playPet();
      this.lastPetSoundTime = now;
      if (this.onPetCallback) this.onPetCallback();
    }
  }

  stopPetting() {
    if (this.isPetting) {
      this.isPetting = false;
      this.isDraggingHome = false;
      this.petSwayX = 0;
      this.jumpPlayer(); // なでられて大満足のピョンジャンプ！
      if (this.onPetEndCallback) this.onPetEndCallback();
    } else {
      this.isDraggingHome = false;
    }
  }

  bindEvents() {
    window.addEventListener("resize", () => {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      if (width && height && this.camera && this.renderer) {
        this.aspect = width / height;
        this.camera.aspect = this.aspect;
        this.camera.fov = this.aspect < 0.8 ? 64 : 56;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
      }
    });

    const handleDown = (clientX) => this.startPetting(clientX);
    const handleMove = (clientX) => this.movePetting(clientX);
    const handleUp = () => this.stopPetting();

    this.container.addEventListener("mousedown", (e) => handleDown(e.clientX));
    window.addEventListener("mousemove", (e) => handleMove(e.clientX));
    window.addEventListener("mouseup", handleUp);

    this.container.addEventListener("touchstart", (e) => {
      if (e.touches.length > 0) handleDown(e.touches[0].clientX);
    }, { passive: true });
    window.addEventListener("touchmove", (e) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX);
    }, { passive: true });
    window.addEventListener("touchend", handleUp);

    // DOM要素（#home-pet-zone & #home-partner-touch-area）との直結バインド
    const petZone = document.getElementById("home-pet-zone");
    const petHint = document.getElementById("home-partner-touch-area");
    [petZone, petHint].forEach((el) => {
      if (!el) return;
      el.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        handleDown(e.clientX);
      });
      el.addEventListener("touchstart", (e) => {
        if (e.touches.length > 0) {
          handleDown(e.touches[0].clientX);
        }
      }, { passive: true });
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const delta = Math.min(0.1, Math.max(0.001, (now - (this.lastFrameTime || now)) / 1000));
    this.lastFrameTime = now;
    this.charAnimTime += delta;

    if (this.mode === "title") {
      // タイトル画面：低空疾走デモ＆滑らかなカメラロール
      for (const seg of this.roadSegments) {
        seg.position.z += 28 * delta;
        if (seg.position.z > 25) seg.position.z -= 180;
      }
      for (const bldg of this.cityBuildings) {
        bldg.position.z += 28 * delta;
        if (bldg.position.z > 25) bldg.position.z -= 240;
      }
      for (const ring of this.overheadRings) {
        ring.position.z += 28 * delta;
        if (ring.position.z > 20) ring.position.z -= 180;
      }
      this.camera.position.x = Math.sin(this.charAnimTime * 0.8) * 1.4;
      this.camera.rotation.z = -Math.sin(this.charAnimTime * 0.8) * 0.05;
      this.camera.lookAt(0, 1.8, -20);

    } else if (this.mode === "home") {
      // ホーム待機：上下パネルの開口部に全身が完全に収まる高さで自転＆浮遊
      if (this.homePedestal) {
        this.homePedestal.rotation.y += 0.25 * delta;
        this.homePedestal.position.y = 1.10 + Math.sin(this.charAnimTime * 2.0) * 0.02;
      }
      if (this.currentCharModel) {
        const ud = this.currentCharModel.userData;

        if (!this.isEating) {
          if (!this.isDraggingHome && !this.isPetting) {
            this.homeRotationY += 0.45 * delta;
          }
          this.playerGroup.rotation.y = this.homeRotationY;

          if (this.isPetting) {
            // なでなで中：目を細めて笑顔(^ ^)、頭をなでられた方向へ傾ける、耳と尻尾をパタパタ
            if (ud.happyEyes && ud.normalEyes) {
              ud.happyEyes.visible = true;
              ud.normalEyes.visible = false;
            }
            if (ud.head) ud.head.rotation.z = (this.petSwayX || 0) * 0.35;
            if (ud.leftEar && ud.rightEar) {
              ud.leftEar.rotation.z = Math.PI / 8 - Math.abs(Math.sin(this.charAnimTime * 14)) * 0.2;
              ud.rightEar.rotation.z = -Math.PI / 8 + Math.abs(Math.sin(this.charAnimTime * 14)) * 0.2;
            }
            if (ud.tail) ud.tail.rotation.y = Math.sin(this.charAnimTime * 24) * 0.45;
          } else {
            // 通常待機
            if (ud.happyEyes && ud.normalEyes && ud.happyEyes.visible) {
              ud.happyEyes.visible = false;
              ud.normalEyes.visible = true;
            }
            if (ud.head) ud.head.rotation.z = Math.sin(this.charAnimTime * 2.2) * 0.06;
            if (ud.leftArm) ud.leftArm.rotation.z = Math.sin(this.charAnimTime * 2.5) * 0.15;
            if (ud.rightArm) ud.rightArm.rotation.z = -Math.sin(this.charAnimTime * 2.5) * 0.15;
            if (ud.tail) ud.tail.rotation.y = Math.sin(this.charAnimTime * 3.5) * 0.25;
          }
        }

        // ホームでのジャンプ（なでなで終了時や食事クライマックス）
        if (this.isJumping) {
          this.jumpProgress += delta * 3.6;
          const jumpY = Math.sin(this.jumpProgress * Math.PI) * 0.45;
          this.playerGroup.position.y = 1.30 + jumpY;
          if (this.currentCharModel) {
            this.currentCharModel.rotation.y += delta * 14;
          }
          if (this.jumpProgress >= 1.0) {
            this.isJumping = false;
            this.jumpProgress = 0;
            this.playerGroup.position.y = 1.30;
            if (this.currentCharModel) this.currentCharModel.rotation.y = 0;
          }
        } else if (!this.isEating) {
          this.playerGroup.position.y = 1.30 + Math.sin(this.charAnimTime * 2.4) * 0.02;
        }
      }
      // カメラ補間
      this.camera.position.lerp(this.cameraTargetPos, 8 * delta);
      this.camera.lookAt(this.cameraTargetLook);

    } else if (this.mode === "dash") {
      // 3Dダッシュ：コーススクロール
      const currentRoadSpeed = this.gateFastForward ? 48 : this.baseRoadSpeed;
      for (const seg of this.roadSegments) {
        seg.position.z += currentRoadSpeed * delta;
        if (seg.position.z > 25) seg.position.z -= 180;
      }
      for (const bldg of this.cityBuildings) {
        bldg.position.z += currentRoadSpeed * delta;
        if (bldg.position.z > 25) bldg.position.z -= 240;
      }
      for (const ring of this.overheadRings) {
        ring.position.z += currentRoadSpeed * delta;
        if (ring.position.z > 20) ring.position.z -= 180;
      }

      // レーンのスムーズ補間＆バンク（傾き）
      const laneLerp = Math.min(1, (this.gateFastForward ? 22 : 14) * delta);
      const prevX = this.currentLaneX;
      this.currentLaneX += (this.targetLaneX - this.currentLaneX) * laneLerp;
      this.playerGroup.position.x = this.currentLaneX;

      // 移動方向への傾きバンク演出
      const laneVelocity = (this.currentLaneX - prevX) / delta;
      const targetRoll = -laneVelocity * 0.08;
      this.playerGroup.rotation.z += (targetRoll - this.playerGroup.rotation.z) * 12 * delta;

      // ダイナミックカメラワーク（少し追従）
      const camTargetX = this.currentLaneX * 0.35;
      this.camera.position.x += (camTargetX - this.camera.position.x) * 6 * delta;
      this.camera.rotation.z = -this.playerGroup.rotation.z * 0.4; // カメラのバンク追従

      // 高速ダッシュ時の視野角ズーム
      const targetFov = (this.gateFastForward ? 72 : (this.aspect < 0.8 ? 64 : 56));
      this.camera.fov += (targetFov - this.camera.fov) * 8 * delta;
      this.camera.updateProjectionMatrix();

      // ジャンプ＆走るアニメーション（適正ランナースケール対応）
      const baseY = 0.05;
      if (this.isJumping) {
        this.jumpProgress += delta * 3.6;
        const jumpY = Math.sin(this.jumpProgress * Math.PI) * 1.8;
        this.playerGroup.position.y = baseY + jumpY;
        if (this.playerShadow) {
          const sScale = Math.max(0.3, 1.0 - jumpY * 0.35);
          this.playerShadow.scale.set(sScale, sScale, 1);
          this.playerShadow.material.opacity = 0.25;
        }
        if (this.currentCharModel) {
          this.currentCharModel.rotation.y += delta * 14; // 空中360度スピン
        }
        if (this.jumpProgress >= 1.0) {
          this.isJumping = false;
          this.jumpProgress = 0;
          this.playerGroup.position.y = baseY;
          if (this.currentCharModel) this.currentCharModel.rotation.y = 0;
          if (this.playerShadow) {
            this.playerShadow.scale.set(1, 1, 1);
            this.playerShadow.material.opacity = 0.55;
          }
        }
      } else {
        // 走るバウンドステップ
        const bounce = Math.abs(Math.sin(this.charAnimTime * 14)) * 0.16;
        this.playerGroup.position.y = baseY + bounce;
        if (this.currentCharModel) {
          this.currentCharModel.rotation.y = 0;
          this.currentCharModel.rotation.z = Math.sin(this.charAnimTime * 7) * 0.06;

          // 手足の走りアニメーション
          const ud = this.currentCharModel.userData;
          const legPhase = Math.sin(this.charAnimTime * 14);
          if (ud.leftLeg) ud.leftLeg.rotation.x = legPhase * 0.55;
          if (ud.rightLeg) ud.rightLeg.rotation.x = -legPhase * 0.55;
          if (ud.leftArm) ud.leftArm.rotation.x = -legPhase * 0.45;
          if (ud.rightArm) ud.rightArm.rotation.x = legPhase * 0.45;
          if (ud.tail) ud.tail.rotation.z = Math.sin(this.charAnimTime * 14) * 0.25;
          if (ud.cape) ud.cape.rotation.x = Math.PI / 4.5 + Math.sin(this.charAnimTime * 16) * 0.12;
        }

        // 足元からダストパーティクル放出（一定間隔）
        if (Math.sin(this.charAnimTime * 28) > 0.8) {
          this.emitRunDust(this.currentLaneX, 0, 0.8);
        }
      }

      // ゲートの移動＆衝突判定
      for (let i = this.gates.length - 1; i >= 0; i--) {
        const gate = this.gates[i];

        if (gate.userData.hasCollided) {
          gate.position.z += 36 * delta;
        } else if (this.gateFastForward) {
          gate.position.z += 52 * delta;
        } else if (this.gateWaitMode) {
          if (gate.position.z < -28) {
            gate.position.z = Math.min(-28, gate.position.z + 24 * delta);
          }
        } else {
          gate.position.z += this.gateSpeed * delta;
        }

        // 状態通知
        if (!gate.userData.hasCollided && this.onGateStatusUpdate) {
          const remSec = Math.max(0, -gate.position.z / this.gateSpeed);
          this.onGateStatusUpdate({
            waiting: this.gateWaitMode,
            fastForward: this.gateFastForward,
            remainingSec: remSec,
            isGoal: gate.userData.isGoal
          });
        }

        // キャラクター位置通過判定
        if (!gate.userData.hasCollided && gate.position.z >= 0.2) {
          gate.userData.hasCollided = true;
          this.gateFastForward = false;

          const chosenLane = this.targetLaneX < 0 ? 0 : 1;
          const isCorrect = (chosenLane === gate.userData.question.correctLane);

          if (isCorrect) {
            this.triggerCorrectParticles(this.targetLaneX, 2.2, 0.5);
            this.jumpPlayer();
          }

          if (this.onGatePassed) {
            this.onGatePassed({
              isCorrect,
              question: gate.userData.question,
              chosenLane,
              isGoal: gate.userData.isGoal
            });
          }
        }

        if (gate.position.z > 20) {
          this.disposeGate(gate);
          this.gates.splice(i, 1);
        }
      }
    } else if (this.mode === "battle") {
      // 3Dボスバトル：魔法陣回転＆3Dオービットカメラ＆3種ボスの激しい稼働モーション
      if (this.battleMagicCircle) {
        this.battleMagicCircle.rotation.y += 0.95 * delta;
      }

      // 常時ダイナミックカメラオービット（生き生きとした3Dアリーナの空気感）
      if (!this.isBattleAnim) {
        const camSwayX = Math.sin(this.charAnimTime * 0.9) * 0.45;
        const camSwayY = Math.cos(this.charAnimTime * 0.7) * 0.16;
        this.camera.position.x = this.cameraTargetPos.x + camSwayX;
        this.camera.position.y = this.cameraTargetPos.y + camSwayY;
        this.camera.position.z = this.cameraTargetPos.z;
        this.camera.lookAt(this.cameraTargetLook);
      }

      // ボスごとの専用3Dアクション稼働
      if (this.currentBossModel && !this.isBattleAnim) {
        const bud = this.currentBossModel.userData;
        const bType = bud.bossType || 1;

        if (bType === 1) {
          // ====== WAVE 1: 重装機神 アイアン・ゴーレム ======
          this.bossGroup.position.y = 1.85 + Math.abs(Math.sin(this.charAnimTime * 3.5)) * 0.1;

          // 超巨大回転ドリル！超高速スピン！
          if (bud.drill) {
            bud.drill.rotation.y += 28 * delta;
          }
          // 6連ガトリング砲身の回転
          if (bud.gatling) {
            bud.gatling.rotation.y += 18 * delta;
          }
          // 赤色モノアイがバイザー内を左右に激しくスキャン往復
          if (bud.monoEye) {
            bud.monoEye.position.x = Math.sin(this.charAnimTime * 5.2) * 0.44;
          }
          // 胸のエネルギー炉パルス
          if (bud.core) {
            bud.core.rotation.y += 3.5 * delta;
          }
          // 4本の油圧キャタピラ脚の蠢き
          if (bud.legs) {
            bud.legs.forEach((leg, idx) => {
              leg.position.y = -0.65 + Math.sin(this.charAnimTime * 6 + idx * 1.5) * 0.08;
            });
          }

        } else if (bType === 2) {
          // ====== WAVE 2: 紅蓮竜 フレイム・ワイバーン ======
          this.bossGroup.position.y = 1.85 + Math.sin(this.charAnimTime * 2.8) * 0.18;

          // 4枚の巨大な皮膜翼がバサバサ大きく羽ばたく！
          if (bud.wings) {
            bud.wings.forEach((wing, idx) => {
              const side = idx % 2 === 0 ? 1 : -1;
              wing.rotation.z = Math.sin(this.charAnimTime * 7.5) * 0.58 * side;
            });
          }
          // 長い首とうねる頭部
          if (bud.head) {
            bud.head.rotation.y = Math.sin(this.charAnimTime * 2.2) * 0.28;
            bud.head.rotation.z = Math.cos(this.charAnimTime * 2.2) * 0.15;
          }
          // 巨大な下顎が「ガオー」とパクパク開閉！
          if (bud.dragonJaw) {
            bud.dragonJaw.rotation.x = Math.PI / 2 + Math.abs(Math.sin(this.charAnimTime * 3.2)) * 0.48;
          }
          // 尖った棘尻尾がしなやかに左右にうねる
          if (bud.tail) {
            bud.tail.rotation.y = Math.sin(this.charAnimTime * 4.2) * 0.42;
          }
          if (bud.core) {
            bud.core.rotation.y += 2.8 * delta;
            bud.core.rotation.x += 1.8 * delta;
          }

        } else {
          // ====== WAVE 3: 次元皇帝 アストラル・コア ======
          this.bossGroup.position.y = 1.85 + Math.sin(this.charAnimTime * 2.2) * 0.15;

          // 二重アストラルリングが直交して逆回転！
          if (bud.outerRing) {
            bud.outerRing.rotation.z += 1.8 * delta;
          }
          if (bud.innerRing) {
            bud.innerRing.rotation.y -= 2.4 * delta;
            bud.innerRing.rotation.x += 1.2 * delta;
          }
          // 背後の6本の浮遊光剣が波打つように独立スイング！
          if (bud.swords) {
            bud.swords.forEach((sw, idx) => {
              sw.position.y = 0.6 + Math.sin(this.charAnimTime * 3.8 + idx * 0.8) * 0.24;
              sw.rotation.x = Math.sin(this.charAnimTime * 2.8 + idx) * 0.22;
            });
          }
          // 4機の衛星レーザービットがボスの周りを3D公転！
          if (bud.bits) {
            bud.bits.forEach((bit, idx) => {
              const t = this.charAnimTime * 3.0 + (idx * Math.PI / 2);
              bit.position.set(
                Math.cos(t) * 2.3,
                1.45 + Math.sin(t * 2) * 0.45,
                Math.sin(t) * 1.6 - 0.2
              );
              bit.rotation.y += 6 * delta;
            });
          }
          if (bud.core) {
            bud.core.rotation.y += 4.5 * delta;
            bud.core.rotation.x += 3.2 * delta;
          }
        }
      }

      // 相棒のバトル臨戦モーション（軽やかなステップ＋腕の構え）
      if (this.currentCharModel) {
        const pud = this.currentCharModel.userData;
        if (this.isJumping) {
          this.jumpProgress += delta * 3.8;
          const jumpY = Math.sin(this.jumpProgress * Math.PI) * 1.1;
          this.playerGroup.position.y = 1.75 + jumpY;
          if (this.jumpProgress >= 1.0) {
            this.isJumping = false;
            this.jumpProgress = 0;
            this.playerGroup.position.y = 1.75;
          }
        } else if (!this.isBattleAnim) {
          // 左右へのファイティングステップ
          this.playerGroup.position.x = -1.35 + Math.sin(this.charAnimTime * 4.8) * 0.08;
          this.playerGroup.position.y = 1.75 + Math.abs(Math.sin(this.charAnimTime * 4.8)) * 0.08;

          if (pud.leftArm) pud.leftArm.rotation.set(-0.7, 0.4, 0.3);
          if (pud.rightArm) pud.rightArm.rotation.set(-0.7, -0.4, -0.3);
          if (pud.tail) pud.tail.rotation.y = Math.sin(this.charAnimTime * 12) * 0.35;
        }
      }
    }

    // パーティクルの更新
    // 1. ダスト
    if (this.runDustParticles) {
      const pos = this.runDustParticles.geometry.attributes.position.array;
      const life = this.runDustParticles.userData.life;
      const vels = this.runDustParticles.userData.vels;
      let dustNeedUpdate = false;

      for (let i = 0; i < life.length; i++) {
        if (life[i] > 0) {
          life[i] -= delta;
          pos[i * 3] += vels[i].x * delta;
          pos[i * 3 + 1] += vels[i].y * delta;
          pos[i * 3 + 2] += vels[i].z * delta;
          dustNeedUpdate = true;
        } else {
          pos[i * 3 + 1] = -999;
        }
      }
      if (dustNeedUpdate) {
        this.runDustParticles.geometry.attributes.position.needsUpdate = true;
      }
    }

    // 2. スターバースト
    if (this.sparkleParticles && this.sparkleParticles.userData.activeTime > 0) {
      this.sparkleParticles.userData.activeTime -= delta;
      const pos = this.sparkleParticles.geometry.attributes.position.array;
      const vels = this.sparkleParticles.userData.velocities;
      for (let i = 0; i < vels.length; i++) {
        pos[i * 3] += vels[i].x * delta;
        pos[i * 3 + 1] += vels[i].y * delta;
        pos[i * 3 + 2] += vels[i].z * delta;
        vels[i].y -= 9.8 * delta;
      }
      this.sparkleParticles.geometry.attributes.position.needsUpdate = true;
    }

    // 3. なでなで＆食事の浮遊する3Dハートの更新
    if (this.floatingHearts && this.floatingHearts.length > 0) {
      for (let i = this.floatingHearts.length - 1; i >= 0; i--) {
        const h = this.floatingHearts[i];
        h.userData.age += delta;
        h.position.y += h.userData.vy * delta;
        h.position.x += h.userData.vx * delta + Math.sin(h.userData.age * 8) * 0.01;
        h.rotation.y += h.userData.rotSpeed * delta;
        const progress = h.userData.age / h.userData.maxAge;
        if (progress > 0.6) {
          const fade = 1 - (progress - 0.6) / 0.4;
          h.scale.setScalar(Math.max(0.01, fade * 0.55));
        }
        if (progress >= 1.0) {
          this.scene.remove(h);
          h.traverse((c) => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
          });
          this.floatingHearts.splice(i, 1);
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.Scene3DManager = Scene3DManager;
