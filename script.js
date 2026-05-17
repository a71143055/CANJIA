// 사용자 정보를 저장할 때 사용할 키
const USER_STORAGE_KEY = "canjia_totp_user";

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    loadUserSession();
    setupEventListeners();
    loadDocuments();
    loadProfiles();
});

// 이벤트 리스너 설정
function setupEventListeners() {
    const registerForm = document.getElementById('register-form');
    if (registerForm) registerForm.addEventListener('submit', handleRegister);

    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLoginStep1);

    const twofaForm = document.getElementById('twofa-form');
    if (twofaForm) twofaForm.addEventListener('submit', handleLoginStep2);

    const showLoginBtn = document.getElementById('show-login-btn');
    if (showLoginBtn) showLoginBtn.addEventListener('click', () => showAuthSection('signin'));

    const showRegisterBtn = document.getElementById('show-register-btn');
    if (showRegisterBtn) showRegisterBtn.addEventListener('click', () => showAuthSection('register'));

    const cancelLoginBtn = document.getElementById('cancel-login-btn');
    if (cancelLoginBtn) cancelLoginBtn.addEventListener('click', () => showAuthSection('signin'));

    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    const docForm = document.getElementById('doc-form');
    if (docForm) docForm.addEventListener('submit', handleDocumentSubmit);

    const profileForm = document.getElementById('profile-form');
    if (profileForm) profileForm.addEventListener('submit', handleProfileSubmit);

    // 필드 탭 기능
    setupFieldTabs();
}

// 인증 섹션 표시 (register | signin | twofa)
function showAuthSection(section) {
    const registerSec = document.getElementById('register-section');
    const signinSec   = document.getElementById('signin-section');
    const twofaSec    = document.getElementById('twofa-section');
    const qrSec       = document.getElementById('qr-section');
    const registerFormEl = document.getElementById('register-form');

    if (registerSec) registerSec.style.display = 'none';
    if (signinSec)   signinSec.style.display   = 'none';
    if (twofaSec)    twofaSec.style.display     = 'none';

    if (section === 'register') {
        if (registerSec) registerSec.style.display = 'block';
        if (qrSec) qrSec.style.display = 'none';
        if (registerFormEl) registerFormEl.style.display = 'block';
    } else if (section === 'signin') {
        if (signinSec) signinSec.style.display = 'block';
    } else if (section === 'twofa') {
        if (twofaSec) twofaSec.style.display = 'block';
        // TOTP 입력 필드 초기화 및 포커스
        const codeInput = document.getElementById('totp-code');
        if (codeInput) {
            codeInput.value = '';
            setTimeout(() => codeInput.focus(), 100);
        }
    }
}

// ===== 회원가입 =====
function handleRegister(e) {
    e.preventDefault();

    const username       = document.getElementById('register-username').value.trim();
    const password       = document.getElementById('register-password').value.trim();
    const registerMessage = document.getElementById('register-message');

    if (!username || !password) {
        setMsg(registerMessage, '사용자명과 비밀번호를 모두 입력해주세요.', 'error');
        return;
    }
    if (password.length < 6) {
        setMsg(registerMessage, '비밀번호는 최소 6자 이상이어야 합니다.', 'error');
        return;
    }

    setMsg(registerMessage, '등록 처리 중...', 'pending');

    fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) throw new Error(data.error);

        // QR 코드 표시
        document.getElementById('qr-code').src = data.qr_code;
        document.getElementById('secret-key').textContent = data.secret;
        document.getElementById('qr-section').style.display = 'block';
        document.getElementById('register-form').style.display = 'none';
        setMsg(registerMessage, '등록 성공! QR 코드를 Authenticator 앱으로 스캔하세요.', 'success');
    })
    .catch(err => {
        setMsg(registerMessage, '등록 실패: ' + err.message, 'error');
    });
}

// ===== 1단계 로그인 (아이디 + 비밀번호) =====
function handleLoginStep1(e) {
    e.preventDefault();

    const username     = document.getElementById('login-username').value.trim();
    const password     = document.getElementById('login-password').value.trim();
    const loginMessage = document.getElementById('login-message');

    if (!username || !password) {
        setMsg(loginMessage, '사용자명과 비밀번호를 입력해주세요.', 'error');
        return;
    }

    setMsg(loginMessage, '로그인 처리 중...', 'pending');

    fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',   // ← 세션 쿠키 전송에 필수
        body: JSON.stringify({ username, password })
    })
    .then(r => r.json())
    .then(data => {
        if (data.error || !data.success) throw new Error(data.error || '1단계 로그인 실패');
        setMsg(loginMessage, '', 'pending');
        showAuthSection('twofa');
    })
    .catch(err => {
        setMsg(loginMessage, '로그인 실패: ' + err.message, 'error');
    });
}

// ===== 2단계 인증 (TOTP) =====
function handleLoginStep2(e) {
    e.preventDefault();

    const codeInput   = document.getElementById('totp-code');
    const twofaMessage = document.getElementById('twofa-message');
    const code        = codeInput.value.trim();

    if (!code || code.length !== 6) {
        setMsg(twofaMessage, '6자리 인증 코드를 입력해주세요.', 'error');
        return;
    }

    setMsg(twofaMessage, '인증 처리 중...', 'pending');

    fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',   // ← 세션 쿠키 전송에 필수
        body: JSON.stringify({ code })
    })
    .then(r => r.json())
    .then(data => {
        if (data.error || !data.success) throw new Error(data.error || '2단계 인증 실패');

        const user = { username: data.username, logged_in_at: new Date().toISOString() };
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

        showLoggedInUI(user);
        loadDocuments();
        loadProfiles();
        codeInput.value = '';
        setMsg(twofaMessage, '', 'pending');
    })
    .catch(err => {
        setMsg(twofaMessage, '인증 실패: ' + err.message, 'error');
        codeInput.value = '';
        codeInput.focus();
    });
}

// ===== 세션 / UI =====

function loadUserSession() {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    if (saved) {
        showLoggedInUI(JSON.parse(saved));
    } else {
        showLoginUI();
    }
}

function showLoginUI() {
    const loginSection = document.getElementById('login-section');
    const profileInfo  = document.getElementById('profile-info');
    const profileForm  = document.getElementById('profile-form');

    if (loginSection) loginSection.style.display = 'block';
    if (profileInfo)  profileInfo.style.display  = 'none';
    if (profileForm)  profileForm.style.display  = 'none';

    showAuthSection('signin');
}

function showLoggedInUI(user) {
    const loginSection  = document.getElementById('login-section');
    const profileInfo   = document.getElementById('profile-info');
    const profileForm   = document.getElementById('profile-form');
    const currentUser   = document.getElementById('current-user');

    if (currentUser) currentUser.textContent = user.username;
    if (loginSection) loginSection.style.display = 'none';
    if (profileInfo)  profileInfo.style.display  = 'block';
    if (profileForm)  profileForm.style.display  = 'block';
}

function logout() {
    localStorage.removeItem(USER_STORAGE_KEY);

    // 서버 세션도 초기화
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});

    showLoginUI();

    // 문서·프로필 목록 초기화
    const docList = document.getElementById('doc-list');
    if (docList) docList.innerHTML = '';
    const docCount = document.getElementById('doc-count');
    if (docCount) docCount.textContent = '0개';
}

function getCurrentUser() {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
}

// ===== 유틸리티 =====

function setMsg(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.style.color = type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#666';
}

// ===== 문서 관리 =====

function loadDocuments() {
    const user = getCurrentUser();
    const docList = document.getElementById('doc-list');
    const docCount = document.getElementById('doc-count');

    if (!user || !docList) return;

    fetch('/api/documents', { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
            const userDocs = data.filter(d => d.user_id === user.username);
            if (docCount) docCount.textContent = `${userDocs.length}개`;

            if (userDocs.length === 0) {
                docList.innerHTML = '<div class="empty-state">아직 등록된 문서가 없습니다.</div>';
                return;
            }

            docList.innerHTML = '';
            userDocs.forEach(doc => {
                const card = document.createElement('button');
                card.className = 'doc-card';
                card.type = 'button';
                card.innerHTML = `
                    <span>${doc.field ? doc.field.toUpperCase() : '분류 없음'} · ${formatDate(doc.created_at)}</span>
                    <strong>${escHtml(doc.title)}</strong>
                    <p style="margin-top:8px;font-size:13px;color:#e74c3c;text-align:right;">
                      <span onclick="deleteDocument('${doc.id}', event)" style="cursor:pointer;text-decoration:underline;">삭제</span>
                    </p>
                `;
                docList.appendChild(card);
            });
        })
        .catch(err => console.error('문서 로드 실패:', err));
}

function handleDocumentSubmit(e) {
    e.preventDefault();

    const user = getCurrentUser();
    if (!user) { alert('먼저 로그인해주세요.'); return; }

    const formData = new FormData(e.target);
    const title = formData.get('title')?.trim();
    const field = formData.get('field') || '';

    if (!title) { alert('문서 제목을 입력해주세요.'); return; }

    const docNote = document.getElementById('doc-note');
    setMsg(docNote, '저장 중...', 'pending');

    fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, field, user_id: user.username, created_at: new Date().toISOString() })
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) throw new Error(data.error);
        setMsg(docNote, '문서가 등록되었습니다.', 'success');
        e.target.reset();
        loadDocuments();
        setTimeout(() => setMsg(docNote, '', 'pending'), 2500);
    })
    .catch(err => {
        setMsg(docNote, '저장 실패: ' + err.message, 'error');
    });
}

function deleteDocument(docId, ev) {
    ev.stopPropagation();
    if (!confirm('정말로 삭제하시겠습니까?')) return;

    fetch(`/api/documents?id=${docId}`, { method: 'DELETE', credentials: 'include' })
        .then(r => r.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            loadDocuments();
        })
        .catch(err => alert('삭제 실패: ' + err.message));
}

// ===== 프로필 관리 =====

function loadProfiles() {
    const user = getCurrentUser();
    if (!user) return;

    // 프로필 폼 필드에 저장된 값 채우기 (필요시)
}

function handleProfileSubmit(e) {
    e.preventDefault();

    const user = getCurrentUser();
    if (!user) { alert('먼저 로그인해주세요.'); return; }

    const formData  = new FormData(e.target);
    const interests = formData.get('interest') || '';
    const plan      = formData.get('message') || '';
    const noteEl    = e.target.querySelector('.form-note');

    setMsg(noteEl, '저장 중...', 'pending');

    fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ interests, plan, user_id: user.username, created_at: new Date().toISOString() })
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) throw new Error(data.error);
        setMsg(noteEl, '프로필이 저장되었습니다!', 'success');
        setTimeout(() => setMsg(noteEl, '', 'pending'), 2500);
    })
    .catch(err => setMsg(noteEl, '저장 실패: ' + err.message, 'error'));
}

function deleteProfile(profileId) {
    if (!confirm('정말로 삭제하시겠습니까?')) return;

    fetch(`/api/profiles?id=${profileId}`, { method: 'DELETE', credentials: 'include' })
        .then(r => r.json())
        .then(data => { if (data.error) throw new Error(data.error); })
        .catch(err => alert('삭제 실패: ' + err.message));
}

// ===== 필드 탭 =====

function setupFieldTabs() {
    const tabs = document.querySelectorAll('.field-tab');
    const selectedKicker      = document.getElementById('selected-kicker');
    const workspaceTitle      = document.getElementById('workspace-title');
    const selectedDescription = document.getElementById('selected-description');
    const selectedDomain      = document.getElementById('selected-domain');
    const selectedGoal        = document.getElementById('selected-goal');

    const fieldData = {
        agi:       { kicker: 'AGI',       title: 'AGI[범용 인공 지능]',  description: '사람의 수준에 맞고 사람의 활동 및 외관을 본따서 만든 인공지능입니다.', domain: '발전의 영역', goal: '기술 증진 · 생명 연장 · 우주 유영' },
        actf:      { kicker: 'ACTF',      title: 'ACTF[실감 콘텐츠]',    description: '현실과 유사한 경험을 제공하여 몰입감을 높이는 콘텐츠입니다.',          domain: '발전의 영역', goal: '가상현실 · 증강현실 · 혼합현실' },
        swimming:  { kicker: '수영',      title: '수영',                  description: '제주도의 자연 속에서 즐기는 수영입니다.',                              domain: '네트워크의 영역', goal: '건강 증진 · 커뮤니티 형성' },
        skydiving: { kicker: '스카이 다이빙', title: '스카이 다이빙',    description: '하늘을 나는 경험을 통해 새로운 도전을 즐깁니다.',                      domain: '네트워크의 영역', goal: '도전 정신 · 스트레스 해소' },
        climbing:  { kicker: '암벽 등반', title: '암벽 등반',             description: '제주도의 아름다운 자연 암벽을 등반합니다.',                            domain: '네트워크의 영역', goal: '체력 증진 · 성취감 획득' },
        cafe:      { kicker: '카페 취업', title: '카페 취업',             description: '제주도의 특색 있는 카페에서 일하며 경험을 쌓습니다.',                  domain: '네트워크의 영역', goal: '경제 자립 · 기술 습득' },
        barista:   { kicker: '기술 연마', title: '기술 연마',             description: '최고의 바리스타가 되기 위한 기술을 연마합니다.',                       domain: '네트워크의 영역', goal: '전문성 강화 · 창업 준비' }
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const field = tab.dataset.fieldTarget;
            const d = fieldData[field];
            if (!d) return;

            if (selectedKicker)      selectedKicker.textContent      = d.kicker;
            if (workspaceTitle)      workspaceTitle.textContent      = d.title;
            if (selectedDescription) selectedDescription.textContent = d.description;
            if (selectedDomain)      selectedDomain.textContent      = d.domain;
            if (selectedGoal)        selectedGoal.textContent        = d.goal;

            const docFieldSelect = document.getElementById('doc-field');
            if (docFieldSelect) docFieldSelect.value = field;
        });
    });
}

// ===== 헬퍼 =====

function formatDate(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('ko-KR'); } catch { return ''; }
}

function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
