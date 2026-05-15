const fieldData = {
  agi: {
    label: "AGI",
    title: "AGI[범용 인공 지능]",
    description: "사람의 수준에 맞고 사람의 활동 및 외관을 본따서 만든 인공지능입니다.",
    domain: "발전의 영역",
    goal: "기술 증진 · 생명 연장 · 우주 유영"
  },
  actf: {
    label: "ACTF",
    title: "ACTF[안드로이드 사이보그 트랜스포머]",
    description: "영화 트랜스포머의 상상력을 AGI 기준에 따라 구현하려는 기술 방향입니다.",
    domain: "발전의 영역",
    goal: "기술 증진 · 생명 연장 · 우주 유영"
  },
  swimming: {
    label: "수영",
    title: "수영",
    description: "수영장을 무중력 환경을 간접 체험하는 훈련장으로 바라보는 스포츠 활동입니다.",
    domain: "네트워크 방면",
    goal: "취미 생활 · 신체 적응 · 회원 모집"
  },
  skydiving: {
    label: "스카이 다이빙",
    title: "스카이 다이빙",
    description: "하늘에서 중력을 활용해 활강하며 중력 환경에 적응하는 스포츠입니다.",
    domain: "네트워크 방면",
    goal: "취미 생활 · 중력 적응 · 우주 유영"
  },
  climbing: {
    label: "암벽 등반",
    title: "암벽 등반",
    description: "중력을 거슬러 구조물을 오르며 체력, 집중력, 도전 감각을 기르는 활동입니다.",
    domain: "네트워크 방면",
    goal: "취미 생활 · 신체 강화 · 회원 모집"
  },
  cafe: {
    label: "카페 취업",
    title: "카페 취업",
    description: "제주도 카페를 방문하고 경제 활동 여건을 탐색하는 현실적 자립 단계입니다.",
    domain: "네트워크 방면",
    goal: "경제 자립 · 주거 이전 · 회원 모집"
  },
  barista: {
    label: "기술 연마",
    title: "기술 연마",
    description: "카페 창업 도전을 염두에 두고 바리스타 기술을 직접 확보하는 과정입니다.",
    domain: "네트워크 방면",
    goal: "경제 자립 · 기술 증진 · 주거 이전"
  }
};

const defaultDocs = [
  {
    id: "seed-agi",
    field: "agi",
    author: "정구영",
    title: "CANJIA AGI 연구 메모",
    summary: "사람의 활동과 외관을 기준으로 삼는 범용 인공지능 연구 방향.",
    body: "AGI는 제주 산업 발전의 장기 기술 축이다. 사람의 활동을 돕고 외관과 상호작용 방식까지 고려하는 인공지능을 목표로 한다.",
    date: "2026-05-15"
  },
  {
    id: "seed-cafe",
    field: "cafe",
    author: "정구영",
    title: "제주 카페 탐색 기록",
    summary: "카페 취업과 주거 이전 가능성을 함께 검토하는 경제 자립 문서.",
    body: "카페 방문, 근무 조건, 이동 동선, 기술 연마 가능성을 함께 기록한다. 취업은 CANJIA 네트워크를 현실에서 시작하는 첫 단계다.",
    date: "2026-05-15"
  }
];

const DOC_STORAGE_KEY = "canjia_documents";
const MS_PROFILE_STORAGE_KEY = "canjia_ms_profile";
const GOOGLE_PROFILE_STORAGE_KEY = "canjia_google_profile";
const NAVER_PROFILE_STORAGE_KEY = "canjia_naver_profile";
const AUTH_MODE_KEY = "canjia_ms_auth_mode";

const API_BASE = (() => {
  // 개발 환경에서는 file:// 프로토콜 또는 localhost 사용
  if (window.location.protocol === "file:") {
    return "http://localhost:5000";
  }
  return window.location.origin;
})();

// MSAL 인스턴스 (전역)
let msalInstance = null;

async function initMsalInstance() {
  if (msalInstance) return msalInstance;

  const config = window.MS_LOGIN_CONFIG || {};
  const isConfigured = config.clientId && config.clientId !== "YOUR_MICROSOFT_CLIENT_ID";

  if (!isConfigured) {
    console.warn("마이크로소프트 Client ID가 설정되지 않았습니다.");
    return null;
  }

  const msalConfig = {
    auth: {
      clientId: config.clientId,
      authority: config.authority,
      redirectUri: config.redirectUri
    },
    cache: {
      cacheLocation: "localStorage",
      storeAuthStateInCookie: true
    }
  };

  msalInstance = new msal.PublicClientApplication(msalConfig);
  await msalInstance.initialize();
  
  return msalInstance;
}

async function fetchDocuments(field = null) {
  try {
    const url = new URL("/api/documents", API_BASE);
    if (field) url.searchParams.append("field", field);
    
    const response = await fetch(url);
    if (!response.ok) throw new Error("문서 조회 실패");
    
    return await response.json();
  } catch (error) {
    console.error("API 오류:", error);
    return [];
  }
}

async function saveDocument(docData) {
  try {
    const response = await fetch(`${API_BASE}/api/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(docData)
    });
    
    if (!response.ok) throw new Error("문서 저장 실패");
    
    return await response.json();
  } catch (error) {
    console.error("API 오류:", error);
    throw error;
  }
}

async function deleteDocument(docId) {
  try {
    const response = await fetch(`${API_BASE}/api/documents/${docId}`, {
      method: "DELETE"
    });
    
    if (!response.ok) throw new Error("문서 삭제 실패");
    
    return await response.json();
  } catch (error) {
    console.error("API 오류:", error);
    throw error;
  }
}

async function saveProfile(profileData) {
  try {
    const response = await fetch(`${API_BASE}/api/profiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileData)
    });
    
    if (!response.ok) throw new Error("프로필 저장 실패");
    
    return await response.json();
  } catch (error) {
    console.error("API 오류:", error);
    throw error;
  }
}

const fieldTabs = document.querySelectorAll("[data-field-target]");
const selectedKicker = document.querySelector("#selected-kicker");
const selectedTitle = document.querySelector("#workspace-title");
const selectedDescription = document.querySelector("#selected-description");
const selectedDomain = document.querySelector("#selected-domain");
const selectedGoal = document.querySelector("#selected-goal");
const docList = document.querySelector("#doc-list");
const docCount = document.querySelector("#doc-count");
const docForm = document.querySelector("#doc-form");
const docField = document.querySelector("#doc-field");
const docAuthor = document.querySelector("#doc-author");
const docTitle = document.querySelector("#doc-title");
const docSummary = document.querySelector("#doc-summary");
const docBody = document.querySelector("#doc-body");
const docNote = document.querySelector("#doc-note");
const newDocButton = document.querySelector("#new-doc");
const shareDocButton = document.querySelector("#share-doc");
const profileForm = document.querySelector(".join-form");
const profileNote = document.querySelector(".form-note");
const authStatuses = document.querySelectorAll(".auth-status");
const authButtons = document.querySelectorAll("[data-naver-auth]");

let documents = [];
let selectedFieldKey = "agi";
let editingDocId = "";

async function loadDocuments() {
  try {
    const allDocs = await fetchDocuments();
    return allDocs.length > 0 ? allDocs : [...defaultDocs];
  } catch {
    return [...defaultDocs];
  }
}

function setStatus(elements, message) {
  elements.forEach((element) => {
    element.textContent = message;
  });
}

function setSelectedField(fieldKey) {
  const field = fieldData[fieldKey] || fieldData.agi;
  selectedFieldKey = fieldKey;

  fieldTabs.forEach((tab) => {
    const isActive = tab.dataset.fieldTarget === fieldKey;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  if (selectedKicker) selectedKicker.textContent = field.label;
  if (selectedTitle) selectedTitle.textContent = field.title;
  if (selectedDescription) selectedDescription.textContent = field.description;
  if (selectedDomain) selectedDomain.textContent = field.domain;
  if (selectedGoal) selectedGoal.textContent = field.goal;
  if (docField) docField.value = fieldKey;

  renderDocuments();
}

function renderDocuments() {
  if (!docList || !docCount) return;

  const fieldDocs = documents.filter((doc) => doc.field === selectedFieldKey);
  docCount.textContent = `${fieldDocs.length}개`;
  docList.innerHTML = "";

  if (!fieldDocs.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = `${fieldData[selectedFieldKey].label} 분야에 등록된 문서가 아직 없습니다.`;
    docList.append(empty);
    return;
  }

  fieldDocs.forEach((doc) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "doc-card";
    card.classList.toggle("active", doc.id === editingDocId);

    const meta = document.createElement("span");
    meta.textContent = `${doc.author} · ${doc.date}`;

    const title = document.createElement("strong");
    title.textContent = doc.title;

    const summary = document.createElement("p");
    summary.textContent = doc.summary || "요약이 비어 있습니다.";

    card.append(meta, title, summary);
    card.addEventListener("click", () => loadDocumentIntoEditor(doc.id));
    docList.append(card);
  });
}

function loadDocumentIntoEditor(docId) {
  const doc = documents.find((item) => item.id === docId);
  if (!doc) return;

  editingDocId = doc.id;
  docField.value = doc.field;
  docAuthor.value = doc.author;
  docTitle.value = doc.title;
  docSummary.value = doc.summary;
  docBody.value = doc.body;
  setSelectedField(doc.field);
  docNote.textContent = `"${doc.title}" 문서를 불러왔습니다.`;
}

function resetEditor(fieldKey = selectedFieldKey) {
  editingDocId = "";
  docForm.reset();
  docField.value = fieldKey;
  docAuthor.value = "정구영";
  docNote.textContent = "새 문서를 작성할 수 있습니다.";
  renderDocuments();
}

function createDocumentFromForm() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const payload = {
    id: editingDocId || `doc-${now.getTime()}`,
    field: docField.value,
    author: docAuthor.value.trim() || "작성자",
    title: docTitle.value.trim(),
    summary: docSummary.value.trim(),
    body: docBody.value.trim(),
    date
  };

  saveDocument(payload).then(() => {
    editingDocId = payload.id;
    // 문서 목록 새로고침
    loadDocuments().then((docs) => {
      documents = docs;
      setSelectedField(payload.field);
      docNote.textContent = `"${payload.title}" 문서가 등록되었습니다.`;
    });
  }).catch(() => {
    docNote.textContent = "문서 저장에 실패했습니다.";
  });
}

async function shareCurrentDocument() {
  const title = docTitle.value.trim();
  const field = fieldData[docField.value]?.label || "CANJIA";
  const summary = docSummary.value.trim() || docBody.value.trim().slice(0, 80);

  if (!title) {
    docNote.textContent = "공유할 문서 제목을 먼저 입력해 주세요.";
    return;
  }

  const shareText = `[CANJIA/${field}] ${title} - ${summary}`;

  try {
    await navigator.clipboard.writeText(shareText);
    docNote.textContent = "공유 문구를 클립보드에 복사했습니다.";
  } catch {
    docNote.textContent = shareText;
  }
}

fieldTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setSelectedField(tab.dataset.fieldTarget);
    document.querySelector("#documents")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

docField?.addEventListener("change", () => setSelectedField(docField.value));

docForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!docTitle.value.trim()) {
    docNote.textContent = "문서 제목을 입력해 주세요.";
    return;
  }

  createDocumentFromForm();
});

newDocButton?.addEventListener("click", () => resetEditor());
shareDocButton?.addEventListener("click", shareCurrentDocument);

profileForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = new FormData(profileForm);
  const name = data.get("name")?.toString().trim() || "참여자";
  const interest = data.get("interest")?.toString().trim();

  if (!interest) {
    profileNote.textContent = "관심 분야를 선택해 주세요.";
    return;
  }

  // 네이버 프로필 정보 함께 저장
  const storedProfile = localStorage.getItem(PROFILE_STORAGE_KEY) || localStorage.getItem(LEGACY_PROFILE_STORAGE_KEY);
  const navierProfile = storedProfile ? JSON.parse(storedProfile) : {};
  
  const profilePayload = {
    email: navierProfile.email || `user-${Date.now()}@canjia.local`,
    name: name,
    nickname: navierProfile.nickname || name,
    profileImage: navierProfile.profileImage || "",
    interest: interest,
    joined: new Date().toISOString()
  };

  saveProfile(profilePayload).then(() => {
    profileNote.textContent = `${name}님의 프로필이 저장되었습니다.`;
  }).catch(() => {
    profileNote.textContent = "프로필 저장에 실패했습니다.";
  });
});

function updateAuthStatus(profile) {
  if (!profile) return;

  const displayName = profile.name || profile.email || "사용자";
  setStatus(authStatuses, `✅ ${displayName}님, 로그인되었습니다.`);
}

async function startMicrosoftAuth() {
  const config = window.MS_LOGIN_CONFIG || {};
  const isConfigured = config.clientId && config.clientId !== "YOUR_MICROSOFT_CLIENT_ID";

  if (!isConfigured) {
    alert("⚠️ 마이크로소프트 Client ID가 설정되지 않았습니다.\n\nms-config.js 파일을 열어 다음 단계를 따르세요:\n\n1. https://portal.azure.com 방문\n2. 'Azure Active Directory' > '앱 등록'\n3. '새 등록' 클릭\n4. 앱 이름: CANJIA\n5. 리디렉션 URI: http://localhost:5000/ms-callback.html\n6. 받은 Application ID를 ms-config.js에 입력");
    return;
  }

  setStatus(authStatuses, "🔄 마이크로소프트 로그인을 시작합니다...");

  try {
    const instance = await initMsalInstance();
    if (!instance) {
      setStatus(authStatuses, "❌ 마이크로소프트 SDK를 초기화하지 못했습니다.");
      return;
    }

    // 팝업으로 로그인
    const loginRequest = {
      scopes: window.MS_LOGIN_CONFIG.scopes || ["user.read"]
    };

    const response = await instance.loginPopup(loginRequest);
    
    if (response && response.account) {
      const account = response.account;
      const profile = {
        provider: "microsoft",
        email: account.username || account.localAccountId || "",
        name: account.name || "",
        id: account.localAccountId || ""
      };

      // 로컬 스토리지에 저장
      localStorage.setItem(MS_PROFILE_STORAGE_KEY, JSON.stringify(profile));

      // 백엔드에 프로필 저장
      await saveProfile({
        email: profile.email,
        name: profile.name,
        nickname: profile.name || profile.email?.split("@")[0] || "사용자",
        profileImage: "",
        interest: "",
        provider: "microsoft",
        joined: new Date().toISOString()
      });

      updateAuthStatus(profile);
    }
  } catch (error) {
    console.error("마이크로소프트 로그인 오류:", error);
    setStatus(authStatuses, `❌ 로그인 실패: ${error.message}`);
  }
}

function initMicrosoftLogin() {
  const config = window.MS_LOGIN_CONFIG || {};
  const isConfigured = config.clientId && config.clientId !== "YOUR_MICROSOFT_CLIENT_ID";
  const storedProfile = localStorage.getItem(MS_PROFILE_STORAGE_KEY);

  if (storedProfile) {
    try {
      updateAuthStatus(JSON.parse(storedProfile));
    } catch {
      localStorage.removeItem(MS_PROFILE_STORAGE_KEY);
    }
  }

  if (!authStatuses.length || !authButtons.length) return;

  if (!isConfigured) {
    setStatus(authStatuses, "⚠️ Microsoft 계정 없이도 프로필을 작성할 수 있습니다. (ms-config.js에 Client ID 설정 시 로그인 가능)");
    // 로그인 없이도 진행할 수 있도록 버튼 비활성화만 함
    authButtons.forEach((button) => {
      button.disabled = false;  // 비활성화 하지 않음
      button.title = "Microsoft 계정으로 로그인하려면 Client ID 설정 필요";
      button.addEventListener("click", () => {
        alert("Microsoft 계정 로그인 기능을 사용하려면:\n\n1. Azure Portal에서 앱 등록\n2. Application ID를 ms-config.js에 입력\n\n지금은 프로필을 직접 작성할 수 있습니다.");
      });
    });
    return;
  }

  if (typeof msal === "undefined") {
    setStatus(authStatuses, "❌ 마이크로소프트 로그인 SDK를 불러오지 못했습니다.");
    authButtons.forEach((button) => {
      button.disabled = true;
    });
    return;
  }

  try {
    authButtons.forEach((button) => {
      button.disabled = false;
      button.addEventListener("click", () => startMicrosoftAuth());
    });

    setStatus(authStatuses, "✅ 마이크로소프트 로그인 준비 완료");
  } catch (error) {
    console.error("마이크로소프트 로그인 초기화 오류:", error);
    setStatus(authStatuses, `❌ 로그인 초기화 실패: ${error.message}`);
    authButtons.forEach((button) => {
      button.disabled = true;
    });
  }
}

async function startGoogleAuth() {
  const config = window.GOOGLE_LOGIN_CONFIG || {};
  const isConfigured = config.clientId && config.clientId !== "YOUR_GOOGLE_CLIENT_ID";

  if (!isConfigured) {
    alert("⚠️ 구글 Client ID가 설정되지 않았습니다.\n\ngoogle-config.js 파일을 열어 다음 단계를 따르세요:\n\n1. https://console.cloud.google.com 방문\n2. OAuth 2.0 동의 화면 설정\n3. 사용자 인증 정보 > OAuth 2.0 클라이언트 ID 생성\n4. 승인된 리디렉션 URI: http://localhost:5000/google-callback.html\n5. 받은 Client ID를 google-config.js에 입력");
    return;
  }

  setStatus(authStatuses, "🔄 구글 로그인을 시작합니다...");

  try {
    window.open("google-callback.html", "google-login", "width=600,height=700");
  } catch (error) {
    console.error("구글 로그인 오류:", error);
    setStatus(authStatuses, `❌ 로그인 실패: ${error.message}`);
  }
}

function initGoogleLogin() {
  const config = window.GOOGLE_LOGIN_CONFIG || {};
  const isConfigured = config.clientId && config.clientId !== "YOUR_GOOGLE_CLIENT_ID";
  const storedProfile = localStorage.getItem(GOOGLE_PROFILE_STORAGE_KEY);

  if (storedProfile) {
    try {
      updateAuthStatus(JSON.parse(storedProfile));
    } catch {
      localStorage.removeItem(GOOGLE_PROFILE_STORAGE_KEY);
    }
  }

  if (!authStatuses.length) return;

  if (!isConfigured) {
    return;
  }

  if (typeof google === "undefined") {
    console.warn("구글 SDK를 불러오지 못했습니다.");
    return;
  }

  try {
    // 구글 로그인 버튼을 위한 이벤트 핸들러 추가
    const googleLoginButton = document.querySelector("[data-google-auth]");
    if (googleLoginButton) {
      googleLoginButton.addEventListener("click", () => startGoogleAuth());
    }
  } catch (error) {
    console.error("구글 로그인 초기화 오류:", error);
  }
}

async function startNaverAuth() {
  const config = window.NAVER_LOGIN_CONFIG || {};
  const isConfigured = config.clientId && config.clientId !== "YOUR_NAVER_CLIENT_ID";

  if (!isConfigured) {
    alert("⚠️ 네이버 Client ID가 설정되지 않았습니다.\n\nnaver-config.js 파일을 열어 다음 단계를 따르세요:\n\n1. https://developers.naver.com 방문\n2. 로그인 후 'Application' > '애플리케이션 등록'\n3. 사용 API: Naver ID Login 선택\n4. Callback URL: http://localhost:5000/naver-callback.html\n5. 받은 Client ID를 naver-config.js에 입력");
    return;
  }

  setStatus(authStatuses, "🔄 네이버 로그인을 시작합니다...");

  try {
    window.open("naver-callback.html", "naver-login", "width=600,height=700");
  } catch (error) {
    console.error("네이버 로그인 오류:", error);
    setStatus(authStatuses, `❌ 로그인 실패: ${error.message}`);
  }
}

function initNaverLogin() {
  const config = window.NAVER_LOGIN_CONFIG || {};
  const isConfigured = config.clientId && config.clientId !== "YOUR_NAVER_CLIENT_ID";
  const storedProfile = localStorage.getItem(NAVER_PROFILE_STORAGE_KEY);

  if (storedProfile) {
    try {
      updateAuthStatus(JSON.parse(storedProfile));
    } catch {
      localStorage.removeItem(NAVER_PROFILE_STORAGE_KEY);
    }
  }

  if (!authStatuses.length) return;

  if (!isConfigured) {
    return;
  }

  try {
    // 네이버 로그인 버튼을 위한 이벤트 핸들러 추가
    const naverLoginButton = document.querySelector("[data-naver-auth]");
    if (naverLoginButton) {
      naverLoginButton.addEventListener("click", () => startNaverAuth());
    }
  } catch (error) {
    console.error("네이버 로그인 초기화 오류:", error);
  }
}

window.addEventListener("message", (event) => {
  if (window.location.protocol !== "file:" && event.origin !== window.location.origin) return;
  if (event.data?.type === "MS_LOGIN_SUCCESS") {
    updateAuthStatus(event.data.profile);
  } else if (event.data?.type === "GOOGLE_LOGIN_SUCCESS") {
    updateAuthStatus(event.data.profile);
  } else if (event.data?.type === "NAVER_LOGIN_SUCCESS") {
    updateAuthStatus(event.data.profile);
  }
});

setSelectedField(selectedFieldKey);
window.addEventListener("load", async () => {
  initMicrosoftLogin();
  initGoogleLogin();
  initNaverLogin();
  
  // 초기 문서 로드
  documents = await loadDocuments();
  setSelectedField(selectedFieldKey);
});
